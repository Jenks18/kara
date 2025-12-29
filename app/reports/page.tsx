'use client'

import BottomNav from '@/components/navigation/BottomNav'
import ExpenseCard from '@/components/expense/ExpenseCard'
import CategoryPill from '@/components/ui/CategoryPill'
import FAB from '@/components/ui/FAB'
import { Search, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'

export default function ReportsPage() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  
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
            {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'}
          </p>
        </div>
        
        {/* Expense List */}
        <div className="space-y-3">
          {expenses.map((expense) => (
            <ExpenseCard key={expense.id} {...expense} />
          ))}
        </div>
      </div>
      
      <FAB onClick={() => alert('Opening camera...')} />
      <BottomNav />
    </div>
  )
}
