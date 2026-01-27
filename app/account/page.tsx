'use client'

import { useUser, useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import BottomNav from '@/components/navigation/BottomNav'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { 
  User, 
  Crown, 
  Wallet, 
  Settings, 
  Shield, 
  HelpCircle, 
  Sparkles,
  Wrench,
  Info,
  LogOut,
  ChevronRight,
  Heart
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
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
              {displayName.charAt(0).toUpperCase()}
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
