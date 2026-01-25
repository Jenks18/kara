'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/navigation/BottomNav'
import StatsCard from '@/components/expense/StatsCard'
import ExpenseCard from '@/components/expense/ExpenseCard'
import FAB from '@/components/ui/FAB'
import { Search, Bell, FileText } from 'lucide-react'
import { getExpenseReports, type ExpenseReport } from '@/lib/api/expense-reports'
import Image from 'next/image'

// Force dynamic rendering to avoid Clerk prerender issues
export const dynamic = 'force-dynamic'

export default function HomePage() {
  const { user, isLoaded, isSignedIn } = useUser()
  const router = useRouter()
  const [expenseReports, setExpenseReports] = useState<ExpenseReport[]>([])
  const [loading, setLoading] = useState(true)
  
  // Use email for querying (schema uses user_email not user_id)
  const userEmail = user?.primaryEmailAddress?.emailAddress || 'demo@example.com'
  
  // Redirect unauthenticated users (optional - commented for dev mode)
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      // Uncomment to enforce auth:
      // router.push('/sign-in')
    }
  }, [isLoaded, isSignedIn, router])
  
  // Fetch expense reports on mount
  useEffect(() => {
    async function fetchReports() {
      setLoading(true)
      const reports = await getExpenseReports(userEmail, 10)
      setExpenseReports(reports)
      setLoading(false)
    }
    fetchReports()
  }, [userEmail])
  
  // Mock data (keep for now)
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
        
        {/* Expense Reports Section */}
        {expenseReports.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-200">Expense Reports</h2>
              <button className="text-sm text-primary-400 hover:text-primary-300 font-medium">
                View All
              </button>
            </div>
            
            <div className="space-y-3">
              {expenseReports.map((report) => (
                <div 
                  key={report.id}
                  className="bg-dark-100 rounded-2xl p-4 border border-gray-800 hover:border-gray-700 transition-colors cursor-pointer"
                >
                  {/* Report Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText size={16} className="text-emerald-500" />
                        <h3 className="text-white font-semibold">{report.title}</h3>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${
                          report.status === 'draft' ? 'bg-emerald-500/20 text-emerald-400' :
                          report.status === 'submitted' ? 'bg-amber-500/20 text-amber-400' :
                          report.status === 'approved' ? 'bg-success-500/20 text-success-400' :
                          'bg-danger-500/20 text-danger-400'
                        }`}>
                          {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                        </span>
                        <span>•</span>
                        <span>{report.items.length} expense{report.items.length > 1 ? 's' : ''}</span>
                        <span>•</span>
                        <span>{new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Receipt Thumbnails */}
                  {report.items.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                      {report.items.slice(0, 4).map((item, idx) => (
                        <div key={item.id} className="flex-shrink-0">
                          <div className="relative w-20 h-24 rounded-lg overflow-hidden bg-dark-200 border border-gray-700">
                            <Image
                              src={item.image_url}
                              alt={`Receipt ${idx + 1}`}
                              fill
                              className="object-cover"
                            />
                          </div>
                        </div>
                      ))}
                      {report.items.length > 4 && (
                        <div className="flex-shrink-0">
                          <div className="w-20 h-24 rounded-lg bg-dark-200 border border-gray-700 flex items-center justify-center">
                            <span className="text-gray-400 text-sm font-medium">
                              +{report.items.length - 4}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Report Footer */}
                  <div className="mt-3 pt-3 border-t border-gray-800 flex items-center justify-between">
                    <div className="text-sm text-gray-400">
                      {report.workspace_name}
                    </div>
                    <div className="text-white font-semibold font-mono">
                      ${report.total_amount.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Recent Expenses (Mock Data) */}
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
