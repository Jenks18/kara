'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import BottomNav from '@/components/navigation/BottomNav'
import { 
  DollarSign, 
  Clock, 
  FileText, 
  TrendingUp, 
  TrendingDown,
  Receipt,
  ChevronRight,
  Plus,
  BarChart3
} from 'lucide-react'

// Force dynamic rendering to avoid Clerk prerender issues
export const dynamic = 'force-dynamic'

// === Types ===
interface ExpenseItem {
  id: string
  merchant_name: string | null
  category: string | null
  amount: number
  created_at: string
  status: string
}

interface ExpenseReport {
  id: string
  title: string
  status: string
  created_at: string
  total_amount: number
  item_count: number
}

interface DashboardStats {
  totalExpenses: number
  pendingCount: number
  submittedReportsCount: number
  expensesTrend: number
}

interface HomeClientProps {
  stats: DashboardStats
  recentExpenses: ExpenseItem[]
  activeReports: ExpenseReport[]
  categoryBreakdown: { category: string; amount: number }[]
}

// === Helpers ===
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount)
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
      return { label: 'Pending', bg: 'bg-amber-100', text: 'text-amber-700' }
    case 'approved':
      return { label: 'Approved', bg: 'bg-green-100', text: 'text-green-700' }
    case 'submitted':
      return { label: 'Submitted', bg: 'bg-blue-100', text: 'text-blue-700' }
    case 'rejected':
      return { label: 'Rejected', bg: 'bg-red-100', text: 'text-red-700' }
    default:
      return { label: 'Draft', bg: 'bg-gray-100', text: 'text-gray-600' }
  }
}

// === Component ===
export default function HomeClient({ 
  stats, 
  recentExpenses, 
  activeReports, 
  categoryBreakdown 
}: HomeClientProps) {
  const router = useRouter()

  const maxCategoryAmount = categoryBreakdown.length > 0 
    ? Math.max(...categoryBreakdown.map(c => c.amount)) 
    : 0

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100"
      style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}
    >
      {/* Header - safe area aware */}
      <div 
        className="bg-white border-b border-gray-200 px-4 pb-5"
        style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}
      >
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Your expense overview</p>
        </div>
      </div>

      {/* Content - constrained for mobile */}
      <div className="px-4 py-4 space-y-3 max-w-lg mx-auto">

        {/* === Stat Cards Row === */}
        <div className="grid grid-cols-3 gap-2">
          {/* Total Expenses */}
          <div className="bg-white rounded-xl shadow-sm p-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center mb-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-lg font-bold text-gray-900 leading-tight">{formatCurrency(stats.totalExpenses)}</p>
            <p className="text-xs text-gray-500 mt-0.5">This month</p>
            {stats.expensesTrend !== 0 && (
              <div className={`flex items-center gap-0.5 mt-1 ${stats.expensesTrend > 0 ? 'text-green-600' : 'text-red-500'}`}>
                {stats.expensesTrend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span className="text-xs font-medium">{stats.expensesTrend > 0 ? '+' : ''}{stats.expensesTrend.toFixed(1)}%</span>
              </div>
            )}
          </div>

          {/* Pending */}
          <div className="bg-white rounded-xl shadow-sm p-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center mb-2">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-lg font-bold text-gray-900 leading-tight">{stats.pendingCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">Pending</p>
          </div>

          {/* Reports */}
          <div className="bg-white rounded-xl shadow-sm p-3">
            <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center mb-2">
              <FileText className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-lg font-bold text-gray-900 leading-tight">{stats.submittedReportsCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">Reports</p>
          </div>
        </div>

        {/* === Quick Actions === */}
        <div className="flex gap-2">
          <Link
            href="/create"
            className="flex-1 bg-blue-600 text-white rounded-xl py-3 px-4 font-semibold text-sm text-center active:scale-[0.98] transition-transform touch-manipulation shadow-sm"
          >
            Scan Receipt
          </Link>
          <Link
            href="/reports"
            className="flex-1 bg-white text-gray-900 rounded-xl py-3 px-4 font-semibold text-sm text-center border border-gray-200 active:scale-[0.98] transition-transform touch-manipulation"
          >
            View Reports
          </Link>
        </div>

        {/* === Recent Expenses === */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="text-base font-bold text-gray-900">Recent Expenses</h2>
            <Link href="/reports" className="text-sm font-medium text-blue-600 active:text-blue-700 touch-manipulation flex items-center gap-0.5">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {recentExpenses.length === 0 ? (
            <div className="px-4 pb-4">
              <div className="text-center py-6 text-gray-500">
                <Receipt className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No expenses yet</p>
                <p className="text-xs mt-1">Scan a receipt to get started</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentExpenses.map((expense) => {
                const badge = getStatusBadge(expense.status)
                return (
                  <div 
                    key={expense.id} 
                    className="flex items-center gap-3 px-4 py-3 active:bg-gray-50 touch-manipulation transition-colors"
                    onClick={() => router.push('/reports')}
                  >
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Receipt className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {expense.merchant_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {expense.category || 'Uncategorized'} · {formatDate(expense.created_at)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <p className="font-semibold text-gray-900 text-sm">{formatCurrency(expense.amount)}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${badge.bg} ${badge.text}`}>
                        {badge.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* === Active Reports === */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="text-base font-bold text-gray-900">Active Reports</h2>
            <Link href="/reports" className="text-sm font-medium text-blue-600 active:text-blue-700 touch-manipulation flex items-center gap-0.5">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {activeReports.length === 0 ? (
            <div className="px-4 pb-4">
              <div className="text-center py-6 text-gray-500">
                <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No active reports</p>
              </div>
            </div>
          ) : (
            <div className="px-4 pb-3 space-y-2">
              {activeReports.map((report) => {
                const badge = getStatusBadge(report.status)
                return (
                  <div 
                    key={report.id} 
                    className="p-3 rounded-lg border border-gray-200 active:border-blue-300 transition-colors touch-manipulation"
                    onClick={() => router.push('/reports')}
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <h3 className="font-medium text-gray-900 text-sm truncate flex-1 mr-2">
                        {report.title || 'Untitled Report'}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${badge.bg} ${badge.text}`}>
                        {badge.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        {report.item_count} expense{report.item_count !== 1 ? 's' : ''} · {formatDate(report.created_at)}
                      </p>
                      <p className="font-semibold text-gray-900 text-sm">{formatCurrency(report.total_amount)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Create Report CTA */}
          <div className="px-4 pb-4">
            <button
              onClick={() => router.push('/workspaces')}
              className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 text-sm font-medium active:border-blue-400 active:text-blue-600 transition-colors touch-manipulation flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Create Report
            </button>
          </div>
        </div>

        {/* === Spending by Category === */}
        {categoryBreakdown.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 pt-4 pb-2">
              <BarChart3 className="w-4 h-4 text-gray-500" />
              <h2 className="text-base font-bold text-gray-900">Spending by Category</h2>
            </div>
            <div className="px-4 pb-4 space-y-3">
              {categoryBreakdown.map(({ category, amount }) => (
                <div key={category}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700">{category}</span>
                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(amount)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${maxCategoryAmount > 0 ? (amount / maxCategoryAmount) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
