import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server-client'
import { DEFAULT_CURRENCY } from '@/lib/currency'
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
  
  // Redirect if not authenticated
  if (!userId) {
    redirect('/sign-in')
  }
  
  // Create Supabase client with Clerk JWT - RLS auto-filters by user!
  const supabase = await createServerClient()
  
  // Parallel fetch — RLS handles user filtering
  const [expenseItemsRes, reportsRes, workspacesRes] = await Promise.all([
    supabase
      .from('expense_items')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50),
    // Fetch reports WITH items in a single query (no N+1)
    supabase
      .from('expense_reports')
      .select('*, expense_items(*)')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('workspaces')
      .select('currency')
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1),
  ])

  const expenseItems = expenseItemsRes.data || []
  const rawReports = reportsRes.data || []
  const userCurrency = workspacesRes.data?.[0]?.currency || DEFAULT_CURRENCY

  // Map the joined data to the expected shape
  const reportsWithItems: ExpenseReport[] = rawReports.map((report: any) => ({
    ...report,
    items: report.expense_items || [],
  }))

  return <ReportsClient initialItems={expenseItems} initialReports={reportsWithItems} currency={userCurrency} />
}
