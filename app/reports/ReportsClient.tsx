'use client'

import { useState } from 'react'
import BottomNav from '@/components/navigation/BottomNav'
import ExpenseItemCard from '@/components/expense/ExpenseItemCard'
import CategoryPill from '@/components/ui/CategoryPill'
import { Search, SlidersHorizontal } from 'lucide-react'

interface ExpenseItem {
  id: string
  image_url: string
  created_at: string
  category: string
  amount: number
  processing_status: 'scanning' | 'processed' | 'error'
  merchant_name: string | null
  transaction_date: string | null
}

interface ReportsClientProps {
  initialItems: ExpenseItem[]
}

export default function ReportsClient({ initialItems }: ReportsClientProps) {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedType, setSelectedType] = useState('expense')
  const [showTypeFilter, setShowTypeFilter] = useState(false)
  const [expenseItems] = useState<ExpenseItem[]>(initialItems)
  
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
            <button className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center active:bg-emerald-100 rounded-full transition-colors touch-manipulation">
              <SlidersHorizontal size={24} className="text-gray-600" />
            </button>
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

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {categories.map((category) => (
            <CategoryPill
              key={category.id}
              label={category.label}
              selected={selectedCategory === category.id}
              onClick={() => setSelectedCategory(category.id)}
            />
          ))}
        </div>

        {/* Expense Items */}
        <div className="space-y-3">
          {expenseItems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No receipts found</p>
              <p className="text-sm text-gray-500 mt-2">Upload a receipt to get started</p>
            </div>
          ) : (
            expenseItems.map((item) => (
              <ExpenseItemCard
                key={item.id}
                imageUrl={item.image_url}
                date={item.transaction_date || new Date(item.created_at).toLocaleDateString()}
                type={item.category}
                amount={item.amount}
                status={item.processing_status === 'processed' ? 'processed' : item.processing_status === 'error' ? 'review_required' : 'scanning'}
                userEmail="user@example.com"
                onClick={() => {/* TODO: Open detail */}}
              />
            ))
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
