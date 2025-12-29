'use client'

import BottomNav from '@/components/navigation/BottomNav'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { 
  User, 
  CreditCard, 
  Wallet, 
  Settings, 
  Shield, 
  HelpCircle, 
  Gift,
  Lightbulb,
  Info,
  LogOut,
  ChevronRight
} from 'lucide-react'

export default function AccountPage() {
  interface AccountItem {
    icon: any
    label: string
    href: string
    badge?: string
    external?: boolean
  }
  
  interface AccountSection {
    title: string
    items: AccountItem[]
  }
  
  const accountSections: AccountSection[] = [
    {
      title: 'Account',
      items: [
        { icon: User, label: 'Profile', href: '#' },
        { icon: CreditCard, label: 'Subscription', badge: 'Trial: 30 days left!', href: '#' },
        { icon: Wallet, label: 'Wallet', href: '#' },
        { icon: Settings, label: 'Preferences', href: '#' },
        { icon: Shield, label: 'Security', href: '#' },
      ],
    },
    {
      title: 'General',
      items: [
        { icon: HelpCircle, label: 'Help', external: true, href: '#' },
        { icon: Gift, label: "What's new", external: true, href: '#' },
        { icon: Info, label: 'About', href: '#' },
        { icon: Lightbulb, label: 'Troubleshoot', href: '#' },
        { icon: Gift, label: 'Save the world', href: '#' },
      ],
    },
  ]
  
  return (
    <div className="min-h-screen pb-20" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-dark-200/95 backdrop-blur-lg border-b border-gray-800">
        <div className="px-4 py-6 max-w-md mx-auto">
          {/* Profile Section */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">🦁</span>
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-100">injenga@terpmail.umd.edu</h1>
              <p className="text-sm text-gray-400">injenga@terpmail.umd.edu</p>
            </div>
            <button className="w-10 h-10 rounded-full bg-dark-100 flex items-center justify-center border border-gray-800">
              <span className="text-xl">😊</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="px-4 py-6 max-w-md mx-auto space-y-8">
        {accountSections.map((section, idx) => (
          <div key={idx}>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">
              {section.title}
            </h2>
            
            <div className="space-y-2">
              {section.items.map((item, itemIdx) => {
                const Icon = item.icon
                return (
                  <button
                    key={itemIdx}
                    className="
                      w-full flex items-center justify-between
                      px-4 py-4 min-h-[60px]
                      bg-dark-100 active:bg-dark-300
                      border border-gray-800
                      rounded-xl
                      transition-colors duration-200
                      touch-manipulation
                      group
                    "
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={24} className="text-gray-400 group-hover:text-gray-300" />
                      <span className="font-medium text-gray-200">{item.label}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {item.badge && (
                        <Badge variant="success">{item.badge}</Badge>
                      )}
                      {item.external ? (
                        <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      ) : (
                        <ChevronRight size={20} className="text-gray-500" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
        
        {/* Sign Out */}
        <button className="
          w-full flex items-center gap-3
          px-4 py-4 min-h-[60px]
          bg-dark-100 active:bg-dark-300
          border border-gray-800
          rounded-xl
          transition-colors duration-200
          touch-manipulation
        ">
          <LogOut size={24} className="text-danger-500" />
          <span className="font-medium text-danger-500">Sign out</span>
        </button>
      </div>
      
      <BottomNav />
    </div>
  )
}
