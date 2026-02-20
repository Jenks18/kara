import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server-client'
import { DEFAULT_CURRENCY } from '@/lib/currency'
import HomeClient from './HomeClient'

// Force dynamic rendering — authenticated page
export const dynamic = 'force-dynamic'

// ── Utility: date boundaries ────────────────────────────────────────
function getMonthBoundaries() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return { now, startOfMonth, startOfLastMonth }
}

export default async function HomePage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  // Default empty state — the page always renders
  let stats = {
    totalExpensesThisMonth: 0,
    totalExpensesAllTime: 0,
    receiptCountThisMonth: 0,
    receiptCountAllTime: 0,
    pendingReviewCount: 0,
    activeReportsCount: 0,
    monthOverMonthTrend: 0,
  }
  let recentExpenses: any[] = []
  let activeReports: any[] = []
  let categoryBreakdown: { category: string; amount: number; count: number }[] = []
  let userCurrency = DEFAULT_CURRENCY

  try {
    const supabase = await createServerClient()
    const { startOfMonth, startOfLastMonth } = getMonthBoundaries()

    // ── Parallel fetches for speed ──────────────────────────────────
    const [expenseItemsRes, rawReceiptsRes, reportsRes, workspacesRes] = await Promise.all([
      // Processed expense items (what the Reports page shows)
      supabase
        .from('expense_items')
        .select('id, amount, category, merchant_name, created_at, processing_status, report_id, image_url, transaction_date')
        .order('created_at', { ascending: false })
        .limit(100),

      // Raw receipts (captures that might not have expense_items yet)
      supabase
        .from('raw_receipts')
        .select('id, amount, category, merchant_name, created_at, status')
        .order('created_at', { ascending: false })
        .limit(100),

      // Expense reports
      supabase
        .from('expense_reports')
        .select('id, title, status, created_at, total_amount, workspace_name')
        .order('created_at', { ascending: false })
        .limit(30),
      
      // User's primary workspace (for default currency)
      supabase
        .from('workspaces')
        .select('currency')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1),
    ])

    const expenseItems = expenseItemsRes.data || []
    const rawReceipts = rawReceiptsRes.data || []
    const reports = reportsRes.data || []

    // Detect user's preferred currency from their primary workspace
    if (workspacesRes.data?.[0]?.currency) {
      userCurrency = workspacesRes.data[0].currency
    }

    // ── Merge expense sources ───────────────────────────────────────
    // Use expense_items as primary (processed), fall back to raw_receipts
    // De-duplicate: if an expense_item exists, prefer it over raw_receipt
    const mergedExpenses = expenseItems.length > 0 ? expenseItems : rawReceipts

    // ── Compute statistics ──────────────────────────────────────────
    const thisMonthExpenses = mergedExpenses.filter(
      (e: any) => new Date(e.created_at) >= startOfMonth
    )
    const lastMonthExpenses = mergedExpenses.filter(
      (e: any) => new Date(e.created_at) >= startOfLastMonth && new Date(e.created_at) < startOfMonth
    )

    const thisMonthTotal = thisMonthExpenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0)
    const lastMonthTotal = lastMonthExpenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0)
    const allTimeTotal = mergedExpenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0)

    const trend = lastMonthTotal > 0
      ? Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 1000) / 10
      : 0

    const pendingReviewCount = mergedExpenses.filter(
      (e: any) => e.processing_status === 'scanning' || e.status === 'needs_review'
    ).length

    const activeReportsCount = reports.filter(
      (r: any) => r.status === 'draft' || r.status === 'submitted'
    ).length

    stats = {
      totalExpensesThisMonth: thisMonthTotal,
      totalExpensesAllTime: allTimeTotal,
      receiptCountThisMonth: thisMonthExpenses.length,
      receiptCountAllTime: mergedExpenses.length,
      pendingReviewCount,
      activeReportsCount,
      monthOverMonthTrend: trend,
    }

    // ── Recent expenses (last 5) ────────────────────────────────────
    recentExpenses = mergedExpenses.slice(0, 5).map((e: any) => ({
      id: e.id,
      merchant_name: e.merchant_name || null,
      category: e.category || null,
      amount: e.amount || 0,
      created_at: e.created_at,
      status: e.processing_status || e.status || 'draft',
      image_url: e.image_url || null,
    }))

    // ── Active reports (draft + submitted) ──────────────────────────
    activeReports = reports
      .filter((r: any) => r.status === 'draft' || r.status === 'submitted')
      .slice(0, 3)
      .map((r: any) => ({
        id: r.id,
        title: r.title || 'Untitled Report',
        status: r.status,
        created_at: r.created_at,
        total_amount: r.total_amount || 0,
        workspace_name: r.workspace_name || '',
      }))

    // ── Category breakdown (this month) ─────────────────────────────
    const categoryMap: Record<string, { amount: number; count: number }> = {}
    thisMonthExpenses.forEach((e: any) => {
      const cat = e.category || 'Other'
      if (!categoryMap[cat]) categoryMap[cat] = { amount: 0, count: 0 }
      categoryMap[cat].amount += e.amount || 0
      categoryMap[cat].count += 1
    })
    categoryBreakdown = Object.entries(categoryMap)
      .map(([category, { amount, count }]) => ({ category, amount, count }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6)

  } catch (error) {
    console.error('Dashboard data fetch error:', error)
  }

  return (
    <HomeClient
      stats={stats}
      recentExpenses={recentExpenses}
      activeReports={activeReports}
      categoryBreakdown={categoryBreakdown}
      currency={userCurrency}
    />
  )
}
