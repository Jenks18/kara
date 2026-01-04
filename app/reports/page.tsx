'use client'

import { useEffect, useState } from 'react'
import BottomNav from '@/components/navigation/BottomNav'
import ExpenseItemCard from '@/components/expense/ExpenseItemCard'
import CategoryPill from '@/components/ui/CategoryPill'
import { Search, SlidersHorizontal } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client'

interface ExpenseItem {
  id: string
  image_url: string
  created_at: string
  category: string
  amount: number
  processing_status: 'scanning' | 'processed' | 'error'
  report_id: string
}

interface ExpenseReport {
  user_email: string
}

export default function ReportsPage() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedType, setSelectedType] = useState('expense')
  const [showTypeFilter, setShowTypeFilter] = useState(false)
  const [expenseItems, setExpenseItems] = useState<(ExpenseItem & { report: ExpenseReport })[]>([])
  const [loading, setLoading] = useState(true)
  
  // Fetch expense items
  useEffect(() => {
    async function fetchExpenseItems() {
      if (!isSupabaseConfigured) {
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('expense_items')
          .select(`
            *,
            report:expense_reports(user_email)
          `)
          .order('created_at', { ascending: false })
          .limit(50)

        if (error) {
          console.error('Error fetching expense items:', error)
        } else {
          setExpenseItems(data || [])
        }
      } catch (error) {
        console.error('Error:', error)
      }
      
      setLoading(false)
    }

    fetchExpenseItems()
  }, [])
  
  const categories = [
    { id: 'all', label: 'All' },
    { id: 'fuel', label: 'Fuel' },
    { id: 'paid', label: 'Paid' },
    { id: 'pending', label: 'Pending' },
  ]
  
  const expenses = [
    {
      id: '1',
      merchant: 'Shell Westlands',
      amount: 2.84,
      date: 'Dec 13',
      category: 'Distance',
      distance: '4.05 mi @ KES 0.70 / mi',
      status: 'approved' as const,
    },
  ]
  
  return (
    <div className="min-h-screen pb-20" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-dark-200/95 backdrop-blur-lg border-b border-gray-800">
        <div className="px-4 py-4 max-w-md mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-100">Reports</h1>
            <button className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center active:bg-dark-100 rounded-full transition-colors touch-manipulation">
              <SlidersHorizontal size={24} className="text-gray-400" />
            </button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={20} />
            <input
              type="text"
              placeholder="Search for something"
              className="
                w-full pl-10 pr-4 py-3.5
                bg-dark-100 border border-gray-800
                rounded-xl
                text-gray-200 placeholder-gray-500
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                touch-manipulation
              "
            />
          </div>
          
          {/* Filters */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
            {/* Type Filter */}
            <button
              onClick={() => setShowTypeFilter(true)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                selectedType !== 'expense' 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : 'bg-dark-100 text-gray-400 hover:bg-dark-200'
              }`}
            >
              Type: {selectedType === 'expense' ? 'Expense' : selectedType === 'report' ? 'Expense Report' : 'All'}
            </button>
            
            {/* Category Filters */}
            {categories.map((cat) => (
              <CategoryPill
                key={cat.id}
                label={cat.label}
                selected={selectedCategory === cat.id}
                onClick={() => setSelectedCategory(cat.id)}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="px-4 py-6 max-w-md mx-auto">
        {/* Results Count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-400">
            {expenseItems.length} {expenseItems.length === 1 ? 'expense' : 'expenses'}
          </p>
        </div>
        
        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
            <p className="text-gray-400 mt-4">Loading expenses...</p>
          </div>
        )}
        
        {/* Expense Items List */}
        {!loading && expenseItems.length > 0 && (
          <div className="space-y-3">
            {expenseItems.map((item) => (
              <ExpenseItemCard
                key={item.id}
                imageUrl={item.image_url}
                date={new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                type={item.category}
                amount={item.amount}
                status={item.processing_status === 'error' || item.amount === 0 ? 'review_required' : item.processing_status}
                userEmail={item.report?.user_email || 'injenga@terpmail.umd.edu'}
                onClick={() => {/* TODO: Open expense detail */}}
              />
            ))}
          </div>
        )}
        
        {/* Empty State */}
        {!loading && expenseItems.length === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <Search size={32} className="text-emerald-500" />
            </div>
            <p className="text-gray-400 text-lg">No expenses found</p>
            <p className="text-gray-500 text-sm mt-2">
              {isSupabaseConfigured 
                ? 'Start by creating your first expense report' 
                : 'Configure Supabase to see your expenses'}
            </p>
          </div>
        )}
      </div>
      

      <BottomNav />
      
      {/* Type Filter Modal */}
      {showTypeFilter && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setShowTypeFilter(false)}>
          <div 
            className="bg-dark-200 rounded-t-3xl w-full max-w-[430px] mx-auto p-6 pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-white text-lg font-semibold mb-6">Type</h3>
            
            <div className="space-y-4">
              {[
                { id: 'expense', label: 'Expense' },
                { id: 'report', label: 'Expense Report' },
                { id: 'chat', label: 'Chat' },
                { id: 'trip', label: 'Trip' },
                { id: 'task', label: 'Task' },
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => {
                    setSelectedType(type.id)
                    setShowTypeFilter(false)
                  }}
                  className="w-full flex items-center justify-between py-3 text-left"
                >
                  <span className="text-white text-lg">{type.label}</span>
                  {selectedType === type.id && (
                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setSelectedType('expense')
                  setShowTypeFilter(false)
                }}
                className="flex-1 py-3 rounded-full bg-dark-100 text-gray-400 font-medium"
              >
                Reset
              </button>
              <button
                onClick={() => setShowTypeFilter(false)}
                className="flex-1 py-3 rounded-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400 text-white font-semibold"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
