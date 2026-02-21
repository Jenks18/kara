'use client'

import { useUser, useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useAvatar } from '@/contexts/AvatarContext'
import { useState, useEffect } from 'react'
import { webCache, CacheKey } from '@/lib/webCache'
import BottomNav from '@/components/navigation/BottomNav'
import { 
  User, 
  Settings, 
  Shield, 
  Info,
  LogOut,
  ChevronRight,
} from 'lucide-react'

// Force dynamic rendering to avoid Clerk prerender issues
export const dynamic = 'force-dynamic'

export default function AccountPage() {
  const { user, isLoaded } = useUser()
  const { signOut } = useClerk()
  const { avatar } = useAvatar()
  const router = useRouter()

  const [displayName, setDisplayName] = useState('')
  const [displayEmail, setDisplayEmail] = useState('')

  // Load display data: seed instantly from userId-namespaced cache, then
  // confirm/update with authoritative Clerk data once Clerk is ready.
  // Cross-account safety: different userId → automatic cache miss — no
  // removeItem() is ever needed between accounts.
  useEffect(() => {
    if (!isLoaded || !user) return
    const cache = webCache(user.id)
    // Seed from cache (instant render after first visit)
    const cachedName = cache.get<string>(CacheKey.displayName)
    const cachedEmail = cache.get<string>(CacheKey.displayEmail)
    if (cachedName) setDisplayName(cachedName)
    if (cachedEmail) setDisplayEmail(cachedEmail)
    // Authoritative override from Clerk (Clerk is ready here, so this is synchronous)
    const name = user.fullName || ''
    const email = user.emailAddresses?.[0]?.emailAddress || ''
    setDisplayName(name)
    setDisplayEmail(email)
    cache.set(CacheKey.displayName, name)
    cache.set(CacheKey.displayEmail, email)
  }, [isLoaded, user?.id])

  const handleSignOut = async () => {
    // Optional: wipe current user's cached data from disk (privacy cleanup).
    // Not needed for cross-account safety — different userId = automatic cache miss.
    if (user) {
      try { webCache(user.id).clearAll() } catch {}
    }
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
        { icon: Settings, label: 'Preferences', href: '/account/preferences' },
        { icon: Shield, label: 'Security', href: '/account/security' },
      ],
    },
    {
      title: 'General',
      items: [
        { icon: Info, label: 'About', href: '/account/about' },
        { icon: LogOut, label: 'Sign Out', href: '#', onClick: handleSignOut },
      ],
    },
  ]
  
  return (
    <div className="min-h-screen pb-20 bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="px-6 py-4 max-w-md mx-auto">
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
                      border border-gray-200 hover:border-blue-300
                      rounded-xl shadow-sm
                      transition-colors duration-200
                      touch-manipulation
                      group
                    "
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={24} className={item.label === 'Sign Out' ? 'text-red-500' : 'text-gray-600 group-hover:text-blue-600'} />
                      <span className={`font-medium ${item.label === 'Sign Out' ? 'text-red-500' : 'text-gray-900'}`}>{item.label}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {item.label !== 'Sign Out' && (
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
