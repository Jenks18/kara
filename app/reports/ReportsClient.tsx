'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/navigation/BottomNav'
import ExpenseItemCard from '@/components/expense/ExpenseItemCard'
import CategoryPill from '@/components/ui/CategoryPill'
import { Search, SlidersHorizontal, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
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
}

export default function ReportsClient({ initialItems, initialReports }: ReportsClientProps) {
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedType, setSelectedType] = useState('expense')
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>(initialItems)
  const [reports, setReports] = useState<ExpenseReport[]>(initialReports)
  
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
  
  const categories = [
    { id: 'all', label: 'All' },
    { id: 'fuel', label: 'Fuel' },
    { id: 'paid', label: 'Paid' },
    { id: 'pending', label: 'Pending' },
  ]
  
  return (
    <div className="min-h-screen pb-20 bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-emerald-200">
        <div className="px-4 py-4 max-w-md mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
            {/* Filter button hidden for now */}
            {/* <button className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center active:bg-emerald-100 rounded-full transition-colors touch-manipulation">
              <SlidersHorizontal size={24} className="text-gray-600" />
            </button> */}
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={20} />
            <input
              type="text"
              placeholder="Search receipts..."
              className="w-full bg-white text-gray-900 pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-400 transition-colors shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 max-w-md mx-auto space-y-6">
        {/* Type Filter Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedType('expense')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              selectedType === 'expense'
                ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md'
                : 'bg-white text-gray-600 hover:text-gray-900 border border-gray-200'
            }`}
          >
            Expenses
          </button>
          <button
            onClick={() => setSelectedType('report')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              selectedType === 'report'
                ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md'
                : 'bg-white text-gray-600 hover:text-gray-900 border border-gray-200'
            }`}
          >
            Reports
          </button>
        </div>

        {/* Category Pills - Hidden for now */}
        {/* <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {categories.map((category) => (
            <CategoryPill
              key={category.id}
              label={category.label}
              selected={selectedCategory === category.id}
              onClick={() => setSelectedCategory(category.id)}
            />
          ))}
        </div> */}

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
              expenseItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => router.push(`/reports/${item.report_id}`)}
                  className="bg-white rounded-2xl p-4 border border-gray-200 hover:border-emerald-300 transition-colors cursor-pointer shadow-sm"
                >
                  {/* Receipt Image */}
                  <div className="relative w-full h-48 rounded-lg overflow-hidden bg-gray-100 mb-3">
                    <Image
                      src={item.image_url}
                      alt="Receipt"
                      fill
                      className="object-cover"
                    />
                  </div>
                  
                  {/* Receipt Details */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">
                        {item.merchant_name || 'Unknown Merchant'}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        item.processing_status === 'processed' ? 'bg-emerald-500/20 text-emerald-700' :
                        item.processing_status === 'error' ? 'bg-red-500/20 text-red-700' :
                        'bg-amber-500/20 text-amber-700'
                      }`}>
                        {item.processing_status === 'processed' ? 'Processed' :
                         item.processing_status === 'error' ? 'Review Required' :
                         'Scanning'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {item.transaction_date || new Date(item.created_at).toLocaleDateString()}
                      </span>
                      <span className="text-lg font-bold text-gray-900">
                        KES {item.amount.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {item.category}
                      </span>
                    </div>
                  </div>
                </div>
              ))
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
                    className="bg-white rounded-2xl p-4 border border-gray-200 hover:border-emerald-300 transition-colors cursor-pointer shadow-sm"
                  >
                    {/* Report Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText size={16} className="text-emerald-600" />
                          <h3 className="text-gray-900 font-semibold">{report.title}</h3>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${
                            report.status === 'draft' ? 'bg-gray-500/20 text-gray-700' :
                            report.status === 'submitted' ? 'bg-amber-500/20 text-amber-700' :
                            report.status === 'approved' ? 'bg-emerald-500/20 text-emerald-700' :
                            'bg-red-500/20 text-red-700'
                          }`}>
                            {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                          </span>
                          <span>•</span>
                          <span>{report.items.length} expense{report.items.length !== 1 ? 's' : ''}</span>
                          <span>•</span>
                          <span>{new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
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
                        KES {totalAmount.toFixed(2)}
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
