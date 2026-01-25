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
  
  // No need to filter by user_email - RLS does it automatically!
  const { data: expenseItems, error } = await supabase
    .from('expense_items')
    .select(`
      *,
      report:expense_reports!inner(user_email)
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error fetching expense items:', error)
  }

  return <ReportsClient initialItems={expenseItems || []} />
}
