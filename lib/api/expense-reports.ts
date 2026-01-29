import { supabase, isSupabaseConfigured } from '../supabase/client'

// Type helper to work around Supabase TypeScript strict mode
type SupabaseAny = any

export interface ExpenseReportInput {
  userId: string // Clerk user ID
  userEmail: string
  workspaceName: string
  workspaceAvatar?: string
  title: string
  items: ExpenseItemInput[]
}

export interface ExpenseItemInput {
  imageData: string // base64 or URL
  description?: string
  category?: string
  reimbursable: boolean
  latitude?: number
  longitude?: number
  locationName?: string
}

export interface ExpenseReport {
  id: string
  created_at: string
  user_id: string
  user_email: string
  workspace_name: string
  workspace_avatar: string | null
  title: string
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
  total_amount: number
  items: ExpenseItem[]
}

export interface ExpenseItem {
  id: string
  created_at: string
  image_url: string
  description: string | null
  category: string
  amount: number
  reimbursable: boolean
  processing_status: 'scanning' | 'processed' | 'error'
  merchant_name: string | null
  transaction_date: string | null
}

/**
 * Create a new expense report with items
 */
export async function createExpenseReport(
  data: ExpenseReportInput
): Promise<{ success: boolean; reportId?: string; error?: string }> {
  if (!isSupabaseConfigured) {
    console.warn('⚠️ Supabase not configured. Report will not be saved to database.')
    console.log('💡 To enable database: Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
    return { success: false, error: 'Supabase not configured' }
  }
  
  try {
    // 1. Create the expense report with user_id
    const { data: reportData, error: reportError } = await (supabase
      .from('expense_reports') as SupabaseAny)
      .insert({
        user_id: data.userId,
        user_email: data.userEmail,
        workspace_name: data.workspaceName,
        workspace_avatar: data.workspaceAvatar,
        title: data.title,
        status: 'draft',
        total_amount: 0, // Will be calculated later when items are processed
      })
      .select()
      .single()

    if (reportError || !reportData) {
      return { success: false, error: reportError?.message || 'Failed to create report' }
    }

    // Type assertion to help TypeScript
    const report = reportData as { id: string; [key: string]: any }

    // 2. Upload images and create expense items
    const itemsWithUrls = await Promise.all(
      data.items.map(async (item) => {
        // Try to upload image to Supabase Storage, fallback to base64 if fails
        let imageUrl: string
        try {
          imageUrl = await uploadReceiptImage(item.imageData, report.id)
        } catch (error) {
          // Store base64 data directly if storage upload fails (RLS issue)
          imageUrl = item.imageData
        }
        
        return {
          report_id: report.id,
          image_url: imageUrl,
          description: item.description || null,
          category: item.category || 'Fuel',
          amount: 0, // Will be updated by OCR processing
          reimbursable: item.reimbursable,
          latitude: item.latitude,
          longitude: item.longitude,
          location_name: item.locationName,
          processing_status: 'scanning',
        }
      })
    )

    // 3. Insert expense items
    const { error: itemsError } = await (supabase
      .from('expense_items') as SupabaseAny)
      .insert(itemsWithUrls)

    if (itemsError) {
      console.error('Error creating items:', itemsError)
      // Rollback: delete the report
      await supabase.from('expense_reports').delete().eq('id', report.id)
      return { success: false, error: itemsError.message }
    }

    // 4. Trigger OCR processing in the background (optional)
    // TODO: Call /api/receipts/process endpoint for each item

    return { success: true, reportId: report.id }
  } catch (error: any) {
    console.error('Error creating expense report:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Upload receipt image to Supabase Storage
 */
async function uploadReceiptImage(
  imageData: string,
  reportId: string
): Promise<string> {
  try {
    // Convert base64 to blob
    const base64Data = imageData.split(',')[1]
    const byteCharacters = atob(base64Data)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: 'image/jpeg' })

    // Generate unique filename
    const filename = `${reportId}/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('receipts')
      .upload(filename, blob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
      })

    if (error) {
      console.error('Error uploading image:', error)
      // Fallback: return the base64 data URL
      return imageData
    }

    // Get public URL
    const { data: publicData } = supabase.storage
      .from('receipts')
      .getPublicUrl(filename)

    return publicData.publicUrl
  } catch (error) {
    console.error('Error in uploadReceiptImage:', error)
    // Fallback: return the base64 data URL
    return imageData
  }
}

/**
 * Get all expense reports for a user
 */
export async function getExpenseReports(
  userEmailOrId: string,
  limit: number = 50
): Promise<ExpenseReport[]> {
  if (!isSupabaseConfigured) {
    return []
  }
  
  try {
    console.log('🔍 Querying expense_reports for user_email:', userEmailOrId)
    const { data: reportsData, error: reportsError } = await supabase
      .from('expense_reports')
      .select('*')
      .eq('user_email', userEmailOrId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (reportsError || !reportsData) {
      console.error('Error fetching reports:', reportsError)
      return []
    }

    const reports = reportsData as Array<{ id: string; [key: string]: any }>

    console.log('📦 Found expense_reports:', reports?.length || 0)

    // Fetch items for each report
    const reportsWithItems = await Promise.all(
      reports.map(async (report) => {
        const { data: items, error: itemsError } = await supabase
          .from('expense_items')
          .select('*')
          .eq('report_id', report.id)
          .order('created_at', { ascending: true })

        if (itemsError) {
          console.error('Error fetching items:', itemsError)
          return { ...report, items: [] }
        }

        return { ...report, items }
      })
    )

    return reportsWithItems as unknown as ExpenseReport[]
  } catch (error) {
    console.error('Error getting expense reports:', error)
    return []
  }
}

/**
 * Get a single expense report by ID
 */
export async function getExpenseReport(
  reportId: string
): Promise<ExpenseReport | null> {
  if (!isSupabaseConfigured) {
    return null
  }
  
  try {
    console.log('📄 Fetching report:', reportId)
    const { data: reportData, error: reportError } = await supabase
      .from('expense_reports')
      .select('*')
      .eq('id', reportId)
      .single()

    if (reportError || !reportData) {
      console.error('Error fetching report:', reportError)
      return null
    }

    const report = reportData as { id: string; [key: string]: any }
    console.log('✅ Found report:', report.title)

    console.log('📦 Fetching items for report:', reportId)
    const { data: items, error: itemsError } = await supabase
      .from('expense_items')
      .select('*')
      .eq('report_id', reportId)
      .order('created_at', { ascending: true })

    if (itemsError) {
      console.error('Error fetching items:', itemsError)
      return { ...report, items: [] } as unknown as ExpenseReport
    }

    console.log(`✅ Found ${items?.length || 0} items for report`)
    console.log('Items:', items)

    return { ...report, items } as unknown as ExpenseReport
  } catch (error) {
    console.error('Error getting expense report:', error)
    return null
  }
}

/**
 * Update expense report status
 */
export async function updateReportStatus(
  reportId: string,
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: any = { status }
    
    if (status === 'submitted') {
      updateData.submitted_at = new Date().toISOString()
    } else if (status === 'approved') {
      updateData.approved_at = new Date().toISOString()
    }

    const { error } = await (supabase
      .from('expense_reports') as SupabaseAny)
      .update(updateData)
      .eq('id', reportId)

    if (error) {
      console.error('Error updating report status:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error updating report status:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Delete an expense report and all its items
 */
export async function deleteExpenseReport(
  reportId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Items will be automatically deleted due to ON DELETE CASCADE
    const { error } = await (supabase
      .from('expense_reports') as SupabaseAny)
      .delete()
      .eq('id', reportId)

    if (error) {
      console.error('Error deleting report:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error deleting report:', error)
    return { success: false, error: error.message }
  }
}
