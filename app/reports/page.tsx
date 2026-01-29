import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server-client'
import ReportsClient from './ReportsClient'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface ExpenseItem {
  id: string
  image_url: string
  created_at: string
  category: string
  amount: number
  processing_status: 'scanning' | 'processed' | 'error'
  report_id: string
  merchant_name: string | null
  transaction_date: string | null
}

interface ExpenseReport {
  id: string
  created_at: string
  title: string
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
  workspace_name: string
  items: ExpenseItem[]
}

export default async function ReportsPage() {
  // Get authenticated user
  const { userId } = await auth()
  const user = await currentUser()
  
  // Redirect if not authenticated or missing email
  if (!userId || !user?.emailAddresses?.[0]?.emailAddress) {
    redirect('/sign-in')
  }
  
  // Create Supabase client with Clerk JWT - RLS auto-filters by user!
  const supabase = await createServerClient()
  
  // Fetch all expense items for "Expenses" view - RLS handles user filtering
  const { data: expenseItems } = await supabase
    .from('expense_items')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  console.log('Fetched expense items:', expenseItems?.length || 0)

  // Fetch expense reports with their items for "Reports" view - RLS handles user filtering
  const { data: reports } = await supabase
    .from('expense_reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  console.log('Fetched reports:', reports?.length || 0)

  // For each report, fetch its items
  const reportsWithItems: ExpenseReport[] = []
  if (reports) {
    for (const report of reports) {
      const { data: items } = await supabase
        .from('expense_items')
        .select('*')
        .eq('report_id', report.id)
        .order('created_at', { ascending: true })
      
      console.log(`Report ${report.id} (${report.title}): ${items?.length || 0} items`)
      
      reportsWithItems.push({
        ...report,
        items: items || []
      })
    }
  }

  console.log('Total reports with items:', reportsWithItems.length)

  return <ReportsClient initialItems={expenseItems || []} initialReports={reportsWithItems} />
}
