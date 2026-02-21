import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAndExtractUser } from '@/lib/auth/mobile-auth'
import { rateLimit } from '@/lib/auth/rate-limit'

// Server-side Supabase client with service role for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    // 1. Try Clerk session auth (webapp cookies)
    let userId: string | null = null
    try {
      const authResult = await auth()
      userId = authResult.userId
    } catch {}

    // 2. Try verified mobile JWT (Authorization: Bearer <token>)
    if (!userId) {
      const mobileUser = await verifyAndExtractUser(request)
      if (mobileUser) {
        userId = mobileUser.userId
      }
    }

    // CRITICAL: Account deletion MUST be authenticated — no body userId fallback
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - authentication required' }, { status: 401 })
    }

    // Rate limit: 3 delete requests per minute per user (prevents abuse / accidental double-tap)
    const limited = rateLimit(request, userId, { limit: 3, windowMs: 60_000 })
    if (limited) return limited

    const body = await request.json()
    const { email, reason } = body

    // Log deletion request
    console.log('===== ACCOUNT DELETION REQUEST =====')
    console.log('Date:', new Date().toISOString())
    console.log('User ID:', userId)
    console.log('Email:', email)
    console.log('Reason:', reason || 'Not provided')
    console.log('=====================================')

    // IMMEDIATE DELETION - Execute actual deletion process
    const deletionResult = await deleteUserData(userId, email)
    
    if (!deletionResult.success) {
      console.error('Deletion failed:', deletionResult.error)
      return NextResponse.json(
        { error: 'Failed to delete account: ' + deletionResult.error },
        { status: 500 }
      )
    }

    console.log('===== ACCOUNT DELETION COMPLETE =====')
    console.log('User ID:', userId)
    console.log('Deleted items:', deletionResult.stats)
    console.log('=====================================')
    
    return NextResponse.json({ 
      success: true,
      message: 'Account successfully deleted',
      stats: deletionResult.stats
    })
  } catch (error) {
    console.error('Error processing deletion request:', error)
    return NextResponse.json(
      { error: 'Failed to process deletion request' },
      { status: 500 }
    )
  }
}

/**
 * Delete all user data from Supabase and Clerk
 */
async function deleteUserData(userId: string, email: string) {
  const stats = {
    raw_receipts: 0,
    expense_items: 0,
    expense_reports: 0,
    workspaces: 0,
    user_profiles: 0,
    storage_files: 0,
    clerk_user: false
  }

  try {
    // 1. Delete storage files first (receipts, profile pictures, workspace avatars)
    try {
      // Delete from receipts bucket (folder named by user ID)
      const { data: receiptFiles } = await supabase.storage
        .from('receipts')
        .list(userId)

      if (receiptFiles && receiptFiles.length > 0) {
        const receiptPaths = receiptFiles.map(f => `${userId}/${f.name}`)
        const { error: deleteReceiptsError } = await supabase.storage
          .from('receipts')
          .remove(receiptPaths)
        
        if (!deleteReceiptsError) {
          stats.storage_files += receiptFiles.length
        }
      }

      // Delete from profile-pictures bucket
      const { data: profileFiles } = await supabase.storage
        .from('profile-pictures')
        .list(userId)

      if (profileFiles && profileFiles.length > 0) {
        const profilePaths = profileFiles.map(f => `${userId}/${f.name}`)
        const { error: deleteProfileError } = await supabase.storage
          .from('profile-pictures')
          .remove(profilePaths)
        
        if (!deleteProfileError) {
          stats.storage_files += profileFiles.length
        }
      }

      // Delete from workspace-avatars bucket
      const { data: workspaceFiles } = await supabase.storage
        .from('workspace-avatars')
        .list(userId)

      if (workspaceFiles && workspaceFiles.length > 0) {
        const workspacePaths = workspaceFiles.map(f => `${userId}/${f.name}`)
        const { error: deleteWorkspaceError } = await supabase.storage
          .from('workspace-avatars')
          .remove(workspacePaths)
        
        if (!deleteWorkspaceError) {
          stats.storage_files += workspaceFiles.length
        }
      }
    } catch (storageError) {
      console.warn('Error deleting storage files:', storageError)
      // Continue with database deletion even if storage fails
    }

    // 2. Delete raw_receipts (must come before expense_items due to FK)
    // Find all receipt IDs first
    const { data: reports } = await supabase
      .from('expense_reports')
      .select('id')
      .eq('user_id', userId)

    if (reports && reports.length > 0) {
      const reportIds = reports.map(r => r.id)
      
      // Get expense items to find raw receipt IDs
      const { data: items } = await supabase
        .from('expense_items')
        .select('raw_receipt_id')
        .in('report_id', reportIds)

      const rawReceiptIds = items
        ?.map(i => i.raw_receipt_id)
        .filter(id => id !== null) || []

      // Delete raw receipts
      if (rawReceiptIds.length > 0) {
        const { error: rawReceiptsError, count } = await supabase
          .from('raw_receipts')
          .delete()
          .in('id', rawReceiptIds)

        if (rawReceiptsError) {
          console.warn('Error deleting raw_receipts:', rawReceiptsError)
        } else {
          stats.raw_receipts = count || 0
        }
      }

      // 3. Delete expense_items (linked to reports)
      const { error: itemsError, count: itemsCount } = await supabase
        .from('expense_items')
        .delete()
        .in('report_id', reportIds)

      if (itemsError) {
        console.warn('Error deleting expense_items:', itemsError)
      } else {
        stats.expense_items = itemsCount || 0
      }
    }

    // 4. Delete expense_reports
    const { error: reportsError, count: reportsCount } = await supabase
      .from('expense_reports')
      .delete()
      .eq('user_id', userId)

    if (reportsError) {
      console.warn('Error deleting expense_reports:', reportsError)
    } else {
      stats.expense_reports = reportsCount || 0
    }

    // 5. Delete workspaces
    const { error: workspacesError, count: workspacesCount } = await supabase
      .from('workspaces')
      .delete()
      .eq('user_id', userId)

    if (workspacesError) {
      console.warn('Error deleting workspaces:', workspacesError)
    } else {
      stats.workspaces = workspacesCount || 0
    }

    // 6. Delete user_profiles
    const { error: profileError, count: profileCount } = await supabase
      .from('user_profiles')
      .delete()
      .eq('user_id', userId)

    if (profileError) {
      console.warn('Error deleting user_profiles:', profileError)
    } else {
      stats.user_profiles = profileCount || 0
    }

    // 7. Delete user from Clerk (this removes authentication and logs them out)
    try {
      const clerk = await clerkClient()
      await clerk.users.deleteUser(userId)
      stats.clerk_user = true
    } catch (clerkError) {
      console.error('Error deleting Clerk user:', clerkError)
      // Continue anyway - data is deleted from our DB
    }

    return { success: true, stats }
  } catch (error) {
    console.error('Error in deleteUserData:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      stats 
    }
  }
}
