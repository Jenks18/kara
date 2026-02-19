'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import BottomNav from '@/components/navigation/BottomNav'
import { 
  Wallet,
  Clock, 
  FileText, 
  TrendingUp, 
  TrendingDown,
  Receipt,
  ChevronRight,
  Plus,
  BarChart3,
  Layers
} from 'lucide-react'
import { formatCurrency, formatCurrencyCompact } from '@/lib/currency'

export const dynamic = 'force-dynamic'

// ── Types ────────────────────────────────────────────────────────────

interface ExpenseItem {
  id: string
  merchant_name: string | null
  category: string | null
  amount: number
  created_at: string
  status: string
  image_url?: string | null
}

interface ActiveReport {
  id: string
  title: string
  status: string
  created_at: string
  total_amount: number
  workspace_name: string
}

interface DashboardStats {
  totalExpensesThisMonth: number
  totalExpensesAllTime: number
  receiptCountThisMonth: number
  receiptCountAllTime: number
  pendingReviewCount: number
  activeReportsCount: number
  monthOverMonthTrend: number
}

interface CategoryItem {
  category: string
  amount: number
  count: number
}

interface HomeClientProps {
  stats: DashboardStats
  recentExpenses: ExpenseItem[]
  activeReports: ActiveReport[]
  categoryBreakdown: CategoryItem[]
  currency: string
}

// ── Helpers ──────────────────────────────────────────────────────────

function fmtCurrency(amount: number, code: string): string {
  return formatCurrency(amount, code)
}

function fmtCompact(amount: number, code: string): string {
  return formatCurrencyCompact(amount, code)
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'needs_review':
    case 'scanning':
      return { label: 'Pending', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' }
    case 'processed':
    case 'approved':
      return { label: 'Processed', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' }
    case 'submitted':
      return { label: 'Submitted', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' }
    case 'rejected':
    case 'error':
      return { label: 'Error', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' }
    default:
      return { label: 'Draft', bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' }
  }
}

const CATEGORY_COLORS: Record<string, string> = {
  Fuel: '#3B82F6',
  Transport: '#8B5CF6',
  Food: '#F59E0B',
  Office: '#10B981',
  Travel: '#EC4899',
  Utilities: '#06B6D4',
  Other: '#6B7280',
}

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.Other
}

// ── Component ────────────────────────────────────────────────────────

export default function HomeClient({
  stats,
  recentExpenses,
  activeReports,
  categoryBreakdown,
  currency,
}: HomeClientProps) {
  const router = useRouter()

  const maxCategoryAmount = categoryBreakdown.length > 0
    ? Math.max(...categoryBreakdown.map(c => c.amount))
    : 0

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50"
      style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}
    >
      {/* ── Header ──────────────────────────────────────────────── */}
      <div
        className="bg-white border-b border-gray-100 px-4 pb-4"
        style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}
      >
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Your expense overview</p>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">

        {/* ── Spending Summary Card ─────────────────────────────── */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-5 text-white shadow-lg shadow-blue-600/20">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-blue-100 text-sm font-medium">This Month</p>
              <p className="text-3xl font-bold mt-1 tracking-tight">
                {fmtCurrency(stats.totalExpensesThisMonth, currency)}
              </p>
            </div>
            {stats.monthOverMonthTrend !== 0 && (
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                stats.monthOverMonthTrend > 0
                  ? 'bg-red-400/20 text-red-100'
                  : 'bg-green-400/20 text-green-100'
              }`}>
                {stats.monthOverMonthTrend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {stats.monthOverMonthTrend > 0 ? '+' : ''}{stats.monthOverMonthTrend.toFixed(1)}%
              </div>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-blue-200" />
              <span className="text-blue-100">{stats.receiptCountThisMonth} receipt{stats.receiptCountThisMonth !== 1 ? 's' : ''}</span>
            </div>
            <div className="w-px h-4 bg-blue-400/40" />
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-200" />
              <span className="text-blue-100">{stats.receiptCountAllTime} all time</span>
            </div>
          </div>
        </div>

        {/* ── Stat Pills Row ────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
            </div>
            <p className="text-xl font-bold text-gray-900">{stats.pendingReviewCount}</p>
            <p className="text-xs text-gray-500">Pending</p>
          </div>

          <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <p className="text-xl font-bold text-gray-900">{stats.activeReportsCount}</p>
            <p className="text-xs text-gray-500">Active Reports</p>
          </div>

          <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-green-600" />
              </div>
            </div>
            <p className="text-xl font-bold text-gray-900">{fmtCompact(stats.totalExpensesAllTime, currency)}</p>
            <p className="text-xs text-gray-500">All Time</p>
          </div>
        </div>

        {/* ── Recent Expenses ───────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="text-base font-bold text-gray-900">Recent Expenses</h2>
            <Link href="/reports" className="text-sm font-medium text-blue-600 flex items-center gap-0.5 active:text-blue-700 touch-manipulation">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {recentExpenses.length === 0 ? (
            <div className="px-4 pb-5">
              <div className="text-center py-8 text-gray-400">
                <Receipt className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                <p className="text-sm font-medium text-gray-500">No expenses yet</p>
                <p className="text-xs mt-1 text-gray-400">Scan a receipt to get started</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentExpenses.map((expense) => {
                const badge = getStatusBadge(expense.status)
                return (
                  <div
                    key={expense.id}
                    className="flex items-center gap-3 px-4 py-3 active:bg-gray-50 touch-manipulation transition-colors cursor-pointer"
                    onClick={() => router.push('/reports')}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${getCategoryColor(expense.category || 'Other')}15` }}
                    >
                      <Receipt className="w-5 h-5" style={{ color: getCategoryColor(expense.category || 'Other') }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {expense.merchant_name || 'Unknown Merchant'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {expense.category || 'Uncategorized'} · {formatDate(expense.created_at)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <p className="font-semibold text-gray-900 text-sm">{fmtCurrency(expense.amount, currency)}</p>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${badge.bg} ${badge.text} ${badge.border}`}>
                        {badge.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Active Reports ────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="text-base font-bold text-gray-900">Active Reports</h2>
            <Link href="/reports" className="text-sm font-medium text-blue-600 flex items-center gap-0.5 active:text-blue-700 touch-manipulation">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {activeReports.length === 0 ? (
            <div className="px-4 pb-5">
              <div className="text-center py-8 text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                <p className="text-sm font-medium text-gray-500">No active reports</p>
                <p className="text-xs mt-1 text-gray-400">Reports you create will appear here</p>
              </div>
            </div>
          ) : (
            <div className="px-4 pb-3 space-y-2">
              {activeReports.map((report) => {
                const badge = getStatusBadge(report.status)
                return (
                  <div
                    key={report.id}
                    className="p-3 rounded-xl border border-gray-100 active:border-blue-200 transition-colors touch-manipulation cursor-pointer"
                    onClick={() => router.push('/reports')}
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <h3 className="font-medium text-gray-900 text-sm truncate flex-1 mr-2">
                        {report.title}
                      </h3>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border flex-shrink-0 ${badge.bg} ${badge.text} ${badge.border}`}>
                        {badge.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        {report.workspace_name ? `${report.workspace_name} · ` : ''}{formatDate(report.created_at)}
                      </p>
                      <p className="font-semibold text-gray-900 text-sm">{fmtCurrency(report.total_amount, currency)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="px-4 pb-4">
            <button
              onClick={() => router.push('/workspaces')}
              className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm font-medium active:border-blue-300 active:text-blue-600 transition-colors touch-manipulation flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Create Report
            </button>
          </div>
        </div>

        {/* ── Spending by Category ──────────────────────────────── */}
        {categoryBreakdown.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center gap-2 px-4 pt-4 pb-3">
              <BarChart3 className="w-4 h-4 text-gray-400" />
              <h2 className="text-base font-bold text-gray-900">Spending by Category</h2>
              <span className="ml-auto text-xs text-gray-400">This month</span>
            </div>
            <div className="px-4 pb-4 space-y-3">
              {categoryBreakdown.map(({ category, amount, count }) => (
                <div key={category}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: getCategoryColor(category) }}
                      />
                      <span className="text-sm text-gray-700 font-medium">{category}</span>
                      <span className="text-xs text-gray-400">{count} item{count !== 1 ? 's' : ''}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{fmtCurrency(amount, currency)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${maxCategoryAmount > 0 ? (amount / maxCategoryAmount) * 100 : 0}%`,
                        backgroundColor: getCategoryColor(category),
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Empty state when no data at all ───────────────────── */}
        {recentExpenses.length === 0 && categoryBreakdown.length === 0 && activeReports.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Receipt className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Welcome to Kacha</h3>
            <p className="text-sm text-gray-500 max-w-xs mx-auto">
              Tap the scan button below to capture your first receipt and start tracking expenses.
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
