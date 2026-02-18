'use client'

import { useUser, useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useAvatar } from '@/contexts/AvatarContext'
import { useState, useEffect } from 'react'
import BottomNav from '@/components/navigation/BottomNav'
import Badge from '@/components/ui/Badge'
import { 
  User, 
  Settings, 
  Shield, 
  HelpCircle, 
  Sparkles,
  Wrench,
  Info,
  LogOut,
  ChevronRight,
  PieChart,
} from 'lucide-react'

// Force dynamic rendering to avoid Clerk prerender issues
export const dynamic = 'force-dynamic'

interface CategorySpending {
  category: string
  amount: number
  color: string
  icon: string
}

export default function AccountPage() {
  const { user, isLoaded, isSignedIn } = useUser()
  const { signOut } = useClerk()
  const { avatar } = useAvatar()
  const router = useRouter()

  // Cache user data in localStorage for instant first paint (no flash)
  const [displayName, setDisplayName] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('account_displayName') || ''
    return ''
  })
  const [displayEmail, setDisplayEmail] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('account_displayEmail') || ''
    return ''
  })
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([])
  const [totalSpent, setTotalSpent] = useState(0)
  const [totalReceipts, setTotalReceipts] = useState(0)
  const [memberSince, setMemberSince] = useState('')

  // When Clerk loads, update from authoritative source and persist for next visit
  useEffect(() => {
    if (isLoaded && user) {
      const name = user.fullName || ''
      const email = user.emailAddresses?.[0]?.emailAddress || ''
      setDisplayName(name)
      setDisplayEmail(email)
      localStorage.setItem('account_displayName', name)
      localStorage.setItem('account_displayEmail', email)

      // Set member since date
      const createdDate = new Date(user.createdAt || Date.now())
      setMemberSince(createdDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))
    }
  }, [isLoaded, user])

  // Fetch spending by category
  useEffect(() => {
    async function fetchSpendingData() {
      try {
        const response = await fetch('/api/expense-reports')
        if (response.ok) {
          const items = await response.json()
          
          // Calculate category totals
          const categoryMap: { [key: string]: number } = {}
          items.forEach((item: any) => {
            const category = item.category || 'Other'
            categoryMap[category] = (categoryMap[category] || 0) + item.amount
          })

          // Map to colors and icons
          const categoryColorMap: { [key: string]: { color: string; icon: string } } = {
            'Fuel': { color: 'bg-emerald-500', icon: '⛽' },
            'Food': { color: 'bg-orange-500', icon: '🍔' },
            'Transport': { color: 'bg-blue-500', icon: '🚗' },
            'Shopping': { color: 'bg-purple-500', icon: '🛒' },
            'Entertainment': { color: 'bg-pink-500', icon: '🎬' },
            'Other': { color: 'bg-gray-500', icon: '📦' },
          }

          const categories = Object.entries(categoryMap)
            .map(([category, amount]) => ({
              category,
              amount,
              color: categoryColorMap[category]?.color || 'bg-gray-500',
              icon: categoryColorMap[category]?.icon || '📦',
            }))
            .sort((a, b) => b.amount - a.amount)

          const total = categories.reduce((sum, cat) => sum + cat.amount, 0)
          
          setCategorySpending(categories)
          setTotalSpent(total)
          setTotalReceipts(items.length)
        }
      } catch (error) {
        console.error('Failed to fetch spending data:', error)
      }
    }

    if (isLoaded && user) {
      fetchSpendingData()
    }
  }, [isLoaded, user])

  const handleSignOut = async () => {
    await signOut({ redirectUrl: '/sign-in' })
  }

  interface AccountItem {
    icon: any
    label: string
    href: string
    badge?: string
    external?: boolean
    onClick?: () => void
  }
  
  interface AccountSection {
    title: string
    items: AccountItem[]
  }
  
  const accountSections: AccountSection[] = [
    {
      title: 'Account',
      items: [
        { icon: User, label: 'Profile', href: '/account/profile' },
        // { icon: Crown, label: 'Subscription', badge: 'Trial: 30 days left!', href: '#' },
        // { icon: Wallet, label: 'Wallet', href: '/account/wallet' },
        { icon: Settings, label: 'Preferences', href: '/account/preferences' },
        { icon: Shield, label: 'Security', href: '/account/security' },
      ],
    },
    {
      title: 'General',
      items: [
        { icon: HelpCircle, label: 'Help', external: true, href: '#' },
        { icon: Sparkles, label: "What's new", external: true, href: '#' },
        { icon: Info, label: 'About', href: '/account/about' },
        { icon: Wrench, label: 'Troubleshoot', href: '#' },
        // { icon: Heart, label: 'Save the world', href: '#' },
        { icon: LogOut, label: 'Sign Out', href: '#', onClick: handleSignOut },
      ],
    },
  ]
  
  return (
    <div className="min-h-screen pb-20 bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="px-6 py-4 max-w-md mx-auto">
          {/* Profile Section */}
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${avatar.imageUrl ? 'bg-gray-100' : avatar.color} flex items-center justify-center overflow-hidden flex-shrink-0 shadow-md`}>
              {avatar.imageUrl ? (
                <img 
                  src={avatar.imageUrl} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl">{avatar.emoji}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-semibold text-gray-900 truncate">{displayName}</h1>
              <p className="text-sm text-gray-500 truncate">{displayEmail}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="px-4 py-6 max-w-md mx-auto space-y-8">
        {/* Account Summary Stats */}
        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Details</h2>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className="text-gray-600">Member since</span>
              <span className="text-gray-900 font-medium">{memberSince || 'February 2026'}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className="text-gray-600">Total receipts</span>
              <span className="text-gray-900 font-medium">{totalReceipts}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total spent</span>
              <span className="text-gray-900 font-medium">${totalSpent.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Spending by Category */}
        {categorySpending.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <PieChart size={20} className="text-emerald-600" />
              <h2 className="text-lg font-semibold text-gray-900">Spending by Category</h2>
            </div>

            <div className="space-y-3">
              {categorySpending.map((cat, idx) => {
                const percentage = totalSpent > 0 ? (cat.amount / totalSpent * 100) : 0
                
                return (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{cat.icon}</span>
                        <span className="text-gray-700 font-medium">{cat.category}</span>
                      </div>
                      <span className="text-gray-900 font-semibold">${cat.amount.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${cat.color} rounded-full transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-12 text-right">{percentage.toFixed(0)}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* No spending data yet */}
        {categorySpending.length === 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <PieChart size={20} className="text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">Spending by Category</h2>
            </div>
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <User size={32} className="text-gray-400" />
              </div>
              <p className="text-gray-600">No spending data yet</p>
              <p className="text-gray-500 text-sm mt-1">Start adding receipts to see insights</p>
            </div>
          </div>
        )}

        {accountSections.map((section, idx) => (
          <div key={idx}>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
              {section.title}
            </h2>
            
            <div className="space-y-2">
              {section.items.map((item, itemIdx) => {
                const Icon = item.icon
                return (
                  <button
                    key={itemIdx}
                    onClick={item.onClick || (() => router.push(item.href))}
                    className="
                      w-full flex items-center justify-between
                      px-4 py-4 min-h-[60px]
                      bg-white active:bg-gray-50
                      border border-gray-200 hover:border-emerald-300
                      rounded-xl shadow-sm
                      transition-colors duration-200
                      touch-manipulation
                      group
                    "
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={24} className={item.label === 'Sign Out' ? 'text-red-500' : 'text-gray-600 group-hover:text-emerald-600'} />
                      <span className={`font-medium ${item.label === 'Sign Out' ? 'text-red-500' : 'text-gray-900'}`}>{item.label}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {item.badge && (
                        <Badge variant="success">{item.badge}</Badge>
                      )}
                      {item.external ? (
                        <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      ) : item.label !== 'Sign Out' && (
                        <ChevronRight size={20} className="text-gray-500" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      
      <BottomNav />
    </div>
  )
}
