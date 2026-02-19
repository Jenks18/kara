import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server-client'
import HomeClient from './HomeClient'

// Force dynamic rendering — authenticated page
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  // Authenticate — redirect to sign-in if not logged in
  const { userId } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }

  // Fetch data server-side with Clerk JWT — RLS auto-filters by user
  let stats = { totalExpenses: 0, pendingCount: 0, submittedReportsCount: 0, expensesTrend: 0 }
  let recentExpenses: any[] = []
  let activeReports: any[] = []
  let categoryBreakdown: { category: string; amount: number }[] = []

  try {
    const supabase = await createServerClient()

    // Fetch recent receipts/expenses
    const { data: expenses } = await supabase
      .from('raw_receipts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    // Fetch expense reports
    const { data: reports } = await supabase
      .from('expense_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    if (expenses) {
      // This month's expenses
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      
      const thisMonthExpenses = expenses.filter(
        (e: any) => new Date(e.created_at) >= startOfMonth
      )
      const lastMonthExpenses = expenses.filter(
        (e: any) => new Date(e.created_at) >= startOfLastMonth && new Date(e.created_at) < startOfMonth
      )

      const thisMonthTotal = thisMonthExpenses.reduce(
        (sum: number, e: any) => sum + (e.amount || 0), 0
      )
      const lastMonthTotal = lastMonthExpenses.reduce(
        (sum: number, e: any) => sum + (e.amount || 0), 0
      )

      // Calculate month-over-month trend
      const trend = lastMonthTotal > 0
        ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
        : 0

      const pendingCount = expenses.filter(
        (e: any) => e.status === 'needs_review'
      ).length

      const submittedReportsCount = reports?.filter(
        (r: any) => r.status === 'submitted'
      ).length || 0

      stats = {
        totalExpenses: thisMonthTotal,
        pendingCount,
        submittedReportsCount,
        expensesTrend: Math.round(trend * 10) / 10
      }

      // Recent 5 expenses for the list
      recentExpenses = expenses.slice(0, 5).map((e: any) => ({
        id: e.id,
        merchant_name: e.merchant_name || null,
        category: e.category || null,
        amount: e.amount || 0,
        created_at: e.created_at,
        status: e.status || 'draft'
      }))

      // Category breakdown from all expenses this month
      const categoryMap: Record<string, number> = {}
      thisMonthExpenses.forEach((e: any) => {
        const cat = e.category || 'Other'
        categoryMap[cat] = (categoryMap[cat] || 0) + (e.amount || 0)
      })
      categoryBreakdown = Object.entries(categoryMap)
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)
    }

    // Active reports (not yet approved/rejected)
    if (reports) {
      activeReports = reports
        .filter((r: any) => r.status === 'draft' || r.status === 'submitted')
        .slice(0, 3)
        .map((r: any) => ({
          id: r.id,
          title: r.title || '',
          status: r.status,
          created_at: r.created_at,
          total_amount: r.total_amount || 0,
          item_count: r.expense_items?.length || 0
        }))
    }
  } catch (error) {
    // Fail gracefully — show empty dashboard
    console.error('Dashboard data fetch error:', error)
  }

  return (
    <HomeClient 
      stats={stats}
      recentExpenses={recentExpenses}
      activeReports={activeReports}
      categoryBreakdown={categoryBreakdown}
    />
  )
}
