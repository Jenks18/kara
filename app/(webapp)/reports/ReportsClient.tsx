'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/navigation/BottomNav'
import ExpenseItemCard from '@/components/expense/ExpenseItemCard'
import CategoryPill from '@/components/ui/CategoryPill'
import { FileText, RefreshCw, BadgeCheck, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/currency'
import Image from 'next/image'

interface ExpenseItem {
  id: string
  image_url: string
  created_at: string
  category: string
  amount: number
  processing_status: 'scanning' | 'processed' | 'error'
  merchant_name: string | null
  transaction_date: string | null
  report_id: string
  kra_verified?: boolean
  description?: string | null
}

interface ExpenseReport {
  id: string
  created_at: string
  title: string
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
  workspace_name: string
  items: ExpenseItem[]
}

interface ReportsClientProps {
  initialItems: ExpenseItem[]
  initialReports: ExpenseReport[]
  currency: string
}

export default function ReportsClient({ initialItems, initialReports, currency }: ReportsClientProps) {
  const router = useRouter()
  const [selectedType, setSelectedType] = useState('expense')
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>(initialItems)
  const [reports, setReports] = useState<ExpenseReport[]>(initialReports)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const refreshData = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const [itemsRes, reportsRes] = await Promise.all([
        fetch('/api/expense-reports'),
        fetch('/api/expense-reports?type=reports')
      ])
      if (itemsRes.ok) {
        const data = await itemsRes.json()
        setExpenseItems(data)
      }
      if (reportsRes.ok) {
        const data = await reportsRes.json()
        if (Array.isArray(data)) setReports(data)
      }
    } catch (error) {
      console.error('Failed to refresh:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  // Set up Supabase real-time subscription for expense_items updates
  useEffect(() => {
    const channel = supabase
      .channel('expense-items-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'expense_items'
        },
        async () => {
          // Refetch expense items when any update occurs
          try {
            const response = await fetch('/api/expense-reports')
            if (response.ok) {
              const data = await response.json()
              setExpenseItems(data)
            }
          } catch (error) {
            console.error('Failed to fetch updated items:', error)
          }
        }
      )
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])
  
  return (
    <div className="min-h-screen pb-20 bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-blue-200">
        <div className="px-4 py-4 max-w-md mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <button
            onClick={refreshData}
            disabled={isRefreshing}
            className="p-2 rounded-full hover:bg-blue-50 transition-colors text-blue-600"
          >
            <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 max-w-md mx-auto space-y-6">
        {/* Summary Pills */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-[14px] p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-white/90">Total Spent</p>
              <p className="text-[22px] font-bold text-white mt-1">
                {formatCurrency(expenseItems.reduce((sum, item) => sum + (item.amount || 0), 0), currency)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-white/90">KRA Verified</p>
              <div className="flex items-center gap-1.5 mt-1 bg-white/20 rounded-[10px] px-2.5 py-1.5 justify-end">
                <BadgeCheck size={16} className="text-white" />
                <span className="text-base font-semibold text-white">
                  {expenseItems.filter(item => item.kra_verified).length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Type Filter Tabs – iOS-style segmented control */}
        <div className="flex gap-2 p-1.5 rounded-[14px] bg-white/50 backdrop-blur border border-gray-200/60">
          <button
            onClick={() => setSelectedType('expense')}
            className={`flex-1 py-2.5 px-4 rounded-[10px] font-medium transition-all border ${
              selectedType === 'expense'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md border-blue-500/25'
                : 'bg-blue-500/[0.08] text-blue-600 hover:bg-blue-500/[0.12] border-blue-500/25'
            }`}
          >
            Expenses
          </button>
          <button
            onClick={() => setSelectedType('report')}
            className={`flex-1 py-2.5 px-4 rounded-[10px] font-medium transition-all border ${
              selectedType === 'report'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md border-blue-500/25'
                : 'bg-blue-500/[0.08] text-blue-600 hover:bg-blue-500/[0.12] border-blue-500/25'
            }`}
          >
            Reports
          </button>
        </div>

        {/* Expense Items */}
        <div className="space-y-3">
          {selectedType === 'expense' ? (
            // Show individual expense items (single receipts)
            expenseItems.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">No receipts found</p>
                <p className="text-sm text-gray-500 mt-2">Upload a receipt to get started</p>
              </div>
            ) : (
              expenseItems.map((item) => {
                const needsReview = item.processing_status === 'error'
                const isScanning = item.processing_status === 'scanning'
                const accentClass = isScanning ? 'text-gray-400' : needsReview ? 'text-amber-600' : 'text-blue-600'

                return (
                  <div
                    key={item.id}
                    onClick={() => router.push(`/expense/${item.id}`)}
                    className="bg-white rounded-2xl p-4 border border-gray-200 hover:border-blue-300 transition-colors cursor-pointer shadow-sm"
                  >
                    {/* Main row: icon · merchant+meta · amount+KRA */}
                    <div className="flex items-start gap-3">
                      {/* Receipt thumbnail */}
                      <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {item.image_url ? (
                          <Image
                            src={item.image_url}
                            alt="Receipt"
                            width={36}
                            height={36}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FileText className="w-[18px] h-[18px] text-blue-600" />
                        )}
                      </div>

                      {/* Merchant + category/date */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${accentClass}`}>
                          {item.merchant_name || 'Unknown Merchant'}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {item.category}
                          {' · '}
                          {new Date(item.transaction_date || item.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      </div>

                      {/* Amount + KRA pill */}
                      <div className="text-right flex-shrink-0">
                        {isScanning ? (
                          <span className="text-sm font-bold text-gray-400">Scanning...</span>
                        ) : (
                          <span className={`text-sm font-bold ${accentClass}`}>
                            {formatCurrency(item.amount, currency)}
                          </span>
                        )}
                        {item.kra_verified && (
                          <div className="mt-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-blue-50 float-right">
                            <CheckCircle2 className="w-2.5 h-2.5 text-blue-600" />
                            <span className="text-[10px] font-semibold text-blue-600">KRA</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Review warning banner */}
                    {needsReview && (
                      <div className="mt-3 flex items-start gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200/60">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-amber-600">Please Review</p>
                          <p className="text-[11px] text-amber-600/80">Some fields may need correction.</p>
                        </div>
                      </div>
                    )}

                    {/* Notes preview */}
                    {item.description && !item.description.startsWith('AI confidence') && (
                      <p className="mt-2 text-xs text-gray-500 truncate">
                        📝 {item.description}
                      </p>
                    )}

                    {/* Scanning indicator */}
                    {isScanning && (
                      <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-green-50">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[11px] text-green-600">Scanning receipt...</span>
                      </div>
                    )}
                  </div>
                )
              })
            )
          ) : (
            // Show grouped reports with their items
            reports.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">No reports found</p>
                <p className="text-sm text-gray-500 mt-2">Create a report to get started</p>
              </div>
            ) : (
              reports.map((report) => {
                const totalAmount = report.items.reduce((sum, item) => sum + (item.amount || 0), 0)
                
                return (
                  <div 
                    key={report.id}
                    onClick={() => router.push(`/reports/${report.id}`)}
                    className="bg-white rounded-2xl p-4 border border-gray-200 hover:border-blue-300 transition-colors cursor-pointer shadow-sm"
                  >
                    {/* Report Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText size={16} className="text-blue-600" />
                          <h3 className="text-gray-900 font-semibold">{report.title}</h3>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          {report.status !== 'draft' && (
                            <>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${
                                report.status === 'submitted' ? 'bg-amber-500/20 text-amber-700' :
                                report.status === 'approved' ? 'bg-blue-500/20 text-blue-700' :
                                'bg-red-500/20 text-red-700'
                              }`}>
                                {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                              </span>
                              <span>•</span>
                            </>
                          )}
                          <span>{report.items.length} expense{report.items.length !== 1 ? 's' : ''}</span>
                          <span>•</span>
                          <span>{new Date(report.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Receipt Thumbnails */}
                    {report.items.length > 0 ? (
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
                        {report.items.map((item, idx) => (
                          <div key={item.id} className="flex-shrink-0 snap-start">
                            <div className="relative w-20 h-24 rounded-lg overflow-hidden bg-gray-100 border border-gray-300">
                              <Image
                                src={item.image_url}
                                alt={`Receipt ${idx + 1}`}
                                fill
                                className="object-cover"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-sm text-gray-500">
                        No expenses in this report yet
                      </div>
                    )}
                    
                    {/* Report Footer */}
                    <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        {report.workspace_name}
                      </div>
                      <div className="text-gray-900 font-semibold font-mono">
                        {formatCurrency(totalAmount, currency)}
                      </div>
                    </div>
                  </div>
                )
              })
            )
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
