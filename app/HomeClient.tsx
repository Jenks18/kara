'use client'

import { useEffect, useState } from 'react'
import { DollarSign, Clock, FileText, TrendingUp, TrendingDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ExpenseStats {
  totalExpenses: number
  pendingCount: number
  submittedReportsCount: number
}

interface RecentExpense {
  id: string
  merchant_name: string
  category: string
  amount: number
  date: string
  status: string
}

interface ExpenseReport {
  id: string
  title: string
  status: string
  expense_items: any[]
  total_amount: number
}expenses, setExpenses] = useState<RecentExpense[]>([])
  const [reports, setReports] = useState<ExpenseReport[]>([])
  const [

export default function HomeClient() {
  const [stats, setStats] = useState<ExpenseStats>({
    totalExpenses: 0,
    pendingCount: 0,
    submittedReportsCount: 0
  })
  const [recentExpenses, setRecentExpenses] = useState<RecentExpense[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      // Get expenses
      const { data: expenses } = await supabase
        .from('raw_receipts')
        .select('*')
        .eq('clerk_user_id', user.id)
      // Get reports
      const { data: reports } = await supabase
        .from('expense_reports')
        .select('*')
        .eq('clerk_user_id', user.id)
        .order('created_at', { ascending: false })

      if (expenses) {
        // Calculate total expenses for this month
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const monthlyExpenses = expenses.filter(e => new Date(e.created_at) >= startOfMonth)
        const totalExpenses = monthlyExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
        
        // Count pending (needs_review)
        const pendingCount = expenses.filter(e => e.status === 'needs_review').length
        
        // Count submitted reports
        const submittedReports = reports?.filter(r => r.status === 'submitted') || []
        
        setStats({
          totalExpenses,
          pendingCount,
          submittedReportsCount: submittedReports.length
        })

        // Get recent expenses with status
        const recent = expenses.slice(0, 5).map(e => ({
          id: e.id,
          merchant_name: e.merchant_name || 'Unknown',
          category: e.category || 'Uncategorized',
          amount: e.amount || 0,
          date: e.created_at,
          status: e.status || 'draft'
        }))
        setRecentExpenses(recent)
        setExpenses(recent)
        setReports(reports || []
        }))
        setRecentExpenses(recent)
      }
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 pt-12 pb-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 text-sm mt-1">Welcome back. Here's your expense overview.</p>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="px-6 py-6 space-y-4">
          {/* Total Expenses Card */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center">
                  <DollarSign className="w-7 h-7 text-blue-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.totalExpenses)}</p>
                  <p className="text-sm text-gray-500">This month</p>
                  <p className="text-base font-semibold text-gray-900 mt-1">Total Expenses</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-green-600">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">+12.5%</span>
              </div>
            </div>
          </div>

          {/* Pending Approval Card */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Clock className="w-7 h-7 text-amber-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">{stats.pendingCount}</p>
                  <p className="text-sm text-gray-500">Awaiting review</p>
                  <p className="text-base font-semibold text-gray-900 mt-1">Pending Approval</p>
                </div>
              </div>
              {stats.pendingCount > 0 && (
                <div className="flex items-center gap-1 text-gray-600">
                  <TrendingDown className="w-4 h-4" />
                  <span className="text-sm font-medium">-2</span>
                </div>
              )}
            </div>
          </div>

          {/* Reports Submitted Card */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-green-50 flex items-center justify-center">
                  <FileText className="w-7 h-7 text-green-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">{stats.submittedReportsCount}</p>
                  <p className="text-sm text-gray-500">This month</p>
                  <p className="text-base font-semibold text-gray-900 mt-1">Reports Submitted</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-green-600">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">+1</span>
              </div>
            </div>
          </div>

          {/* Recent Expenses */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Recent Expenses</h2>
              <a href="/reports" className="text-sm font-medium text-blue-600 hover:text-blue-700">View All</a>
            </div>
            {expenses.length === 0 ? (
              <p className="text-gray-600 text-sm">No expenses yet. Start by scanning a receipt!</p>
            ) : (
              <div className="space-y-4">
                {expenses.slice(0, 5).map((expense, index) => (
                  <div key={expense.id}>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900">{expense.merchant_name}</p>
                        <p className="text-sm text-gray-500">{expense.category}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          expense.status === 'needs_review' ? 'bg-amber-100 text-amber-700' :
                          expense.status === 'approved' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {expense.status === 'needs_review' ? 'Pending' : expense.status === 'approved' ? 'Approved' : 'Draft'}
                        </span>
                        <p className="text-lg font-semibold text-gray-900">{formatCurrency(expense.amount)}</p>
                      </div>
                    </div>
                    {index < Math.min(4, expenses.length - 1) && (
                      <div className="border-t border-gray-100 mt-4"></div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Reports */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Active Reports</h2>
              <a href="/reports" className="text-sm font-medium text-blue-600 hover:text-blue-700">View All</a>
            </div>
            {reports.length === 0 ? (
              <p className="text-gray-600 text-sm">No active reports</p>
            ) : (
              <div className="space-y-3">
                {reports.slice(0, 3).map((report) => (
                  <div key={report.id} className="p-4 rounded-xl border border-gray-200 hover:border-blue-300 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{report.title || 'Untitled Report'}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        report.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                        report.status === 'approved' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-500">{report.expense_items?.length || 0} expense{(report.expense_items?.length || 0) !== 1 ? 's' : ''}</p>
                      <p className="text-lg font-semibold text-gray-900">{formatCurrency(report.total_amount || 0)}</p>
                    </div>
                  </div>
                ))}
                <button className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Report
                </button>
              </div>
            )}
          </div>

          {/* Spending by Category */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <h2 className="text-xl font-bold text-gray-900">Spending by Category</h2>
            </div>
            {expenses.length === 0 ? (
              <p className="text-gray-600 text-sm">No spending data available</p>
            ) : (
              <div className="space-y-4">
                {(() => {
                  const categoryTotals = expenses.reduce((acc, exp) => {
                    const cat = exp.category || 'Other'
                    acc[cat] = (acc[cat] || 0) + exp.amount
                    return acc
                  }, {} as Record<string, number>)
                  const maxAmount = Math.max(...Object.values(categoryTotals))
                  return Object.entries(categoryTotals)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([category, amount]) => (
                      <div key={category}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">{category}</span>
                          <span className="text-sm font-semibold text-gray-900">{formatCurrency(amount)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${(amount / maxAmount) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ))
                })()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
