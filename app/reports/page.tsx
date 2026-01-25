import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createAuthenticatedClient } from '@/lib/supabase/auth-client'
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
  
  if (!userId || !user) {
    redirect('/sign-in')
  }

  const userEmail = user.emailAddresses[0]?.emailAddress || ''
  
  // Create authenticated Supabase client
  const supabase = createAuthenticatedClient(userId, userEmail)
  
  // Fetch expense items for this user only
  const { data: expenseItems, error } = await supabase
    .from('expense_items')
    .select(`
      *,
      report:expense_reports!inner(user_email)
    `)
    .eq('expense_reports.user_email', userEmail)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error fetching expense items:', error)
  }

  return <ReportsClient initialItems={expenseItems || []} />
}
