'use client'

import { useUser, useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
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

// Force dynamic rendering to avoid Clerk prerender issues
export const dynamic = 'force-dynamic'

export default function AccountPage() {
  const { user, isLoaded, isSignedIn } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()

  // Redirect unauthenticated users (optional - can disable for dev)
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      // Uncomment to enforce auth:
      // router.push('/sign-in')
    }
  }, [isLoaded, isSignedIn, router])

  const handleSignOut = async () => {
    await signOut()
    router.push('/sign-in')
  }

  // Allow viewing without auth in dev mode
  const displayName = user?.fullName || 'Demo User'
  const displayEmail = user?.emailAddresses[0]?.emailAddress || 'demo@example.com'

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
        { icon: CreditCard, label: 'Subscription', badge: 'Trial: 30 days left!', href: '#' },
        { icon: Wallet, label: 'Wallet', href: '/account/wallet' },
        { icon: Settings, label: 'Preferences', href: '/account/preferences' },
        { icon: Shield, label: 'Security', href: '/account/security' },
      ],
    },
    {
      title: 'General',
      items: [
        { icon: HelpCircle, label: 'Help', external: true, href: '#' },
        { icon: Gift, label: "What's new", external: true, href: '#' },
        { icon: Info, label: 'About', href: '/account/about' },
        { icon: Lightbulb, label: 'Troubleshoot', href: '#' },
        { icon: Gift, label: 'Save the world', href: '#' },
        { icon: LogOut, label: 'Sign Out', href: '#', onClick: handleSignOut },
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
              <h1 className="text-xl font-bold text-gray-100">{displayName}</h1>
              <p className="text-sm text-gray-400">{displayEmail}</p>
            </div>
            <button className="w-10 h-10 rounded-full bg-dark-100 flex items-center justify-center border border-gray-800">
              <span className="text-xl">{user?.imageUrl ? '😊' : '👤'}</span>
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
                    onClick={item.onClick || (() => router.push(item.href))}
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
                      <Icon size={24} className={item.label === 'Sign Out' ? 'text-danger-500' : 'text-gray-400 group-hover:text-gray-300'} />
                      <span className={`font-medium ${item.label === 'Sign Out' ? 'text-danger-500' : 'text-gray-200'}`}>{item.label}</span>
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
