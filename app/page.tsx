'use client'

import BottomNav from '@/components/navigation/BottomNav'
import StatsCard from '@/components/expense/StatsCard'
import ExpenseCard from '@/components/expense/ExpenseCard'
import FAB from '@/components/ui/FAB'
import { Search, Bell } from 'lucide-react'

export default function HomePage() {
  // Mock data
  const expenses = [
    {
      id: '1',
      merchant: 'Shell Westlands',
      amount: 5250.00,
      date: 'Dec 26',
      category: 'Fuel',
      distance: '4.05 mi @ KES 0.70 / mi',
      status: 'approved' as const,
    },
    {
      id: '2',
      merchant: 'Total Energies Karen',
      amount: 3800.50,
      date: 'Dec 25',
      category: 'Fuel',
      distance: '3.2 mi @ KES 0.68 / mi',
      status: 'approved' as const,
    },
  ]
  
  return (
    <div className="min-h-screen pb-20" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-dark-200/95 backdrop-blur-lg border-b border-gray-800">
        <div className="px-4 py-4 max-w-md mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-100">Inbox</h1>
            </div>
            <button className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center active:bg-dark-100 rounded-full transition-colors touch-manipulation">
              <Search size={24} className="text-gray-400" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="px-4 py-6 max-w-md mx-auto space-y-6">
        {/* Stats Card */}
        <StatsCard 
          title="Total Fuel Expenses"
          amount={28476}
          change="+12% from last month"
          period="This Month"
        />
        
        {/* Recent Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-200">Recent Expenses</h2>
            <button className="text-sm text-primary-400 hover:text-primary-300 font-medium">
              View All
            </button>
          </div>
          
          <div className="space-y-3">
            {expenses.map((expense) => (
              <ExpenseCard key={expense.id} {...expense} />
            ))}
          </div>
        </div>
        
        {/* Messages */}
        <div>
          <h2 className="text-lg font-semibold text-gray-200 mb-4">Messages</h2>
          
          <div className="space-y-3">
            <div className="bg-dark-100 rounded-xl p-4 border border-gray-800">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">🎉</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-200 mb-1">Concierge</h3>
                  <p className="text-sm text-gray-400">
                    Recapping your first week in Kara! You've recorded 5 fuel expenses totaling KES 28,476.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-dark-100 rounded-xl p-4 border border-gray-800">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-success-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">✅</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-200 mb-1">Manager McTest</h3>
                  <p className="text-sm text-gray-400">
                    Thanks for sending me that test expense! Next, try submitting a report.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <FAB onClick={() => alert('Opening camera...')} />
      <BottomNav />
    </div>
  )
}
