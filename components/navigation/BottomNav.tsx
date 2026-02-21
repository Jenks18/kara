'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, FileText, Building2, ScanLine } from 'lucide-react'
import { useAvatar } from '@/contexts/AvatarContext'

export default function BottomNav() {
  const pathname = usePathname()
  const { avatar } = useAvatar()
  
  const leftNavItems = [
    { id: 'home', label: 'Home', icon: Home, href: '/home' },
    { id: 'reports', label: 'Reports', icon: FileText, href: '/reports' },
  ]
  
  const rightNavItems = [
    { id: 'workspaces', label: 'Workspaces', icon: Building2, href: '/workspaces' },
    { id: 'account', label: 'Account', icon: null, href: '/account', isAvatar: true },
  ]
  
  return (
    <nav 
      className="
        fixed bottom-0 left-0 right-0
        bg-white/80 backdrop-blur-lg border-t border-blue-200
        z-40
        shadow-lg
      "
      style={{
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))'
      }}
    >
      <div className="relative flex items-center justify-around max-w-md mx-auto py-2 px-2">
        {/* Left Nav Items */}
        <div className="flex items-center justify-around flex-1">
          {leftNavItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`
                  flex flex-col items-center gap-1 px-3 py-2
                  min-w-[60px]
                  transition-colors duration-200 rounded-lg
                  active:scale-95 touch-manipulation
                  ${isActive ? 'text-blue-600' : 'text-gray-600 active:text-blue-600'}
                `}
              >
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-xs font-medium whitespace-nowrap">{item.label}</span>
              </Link>
            )
          })}
        </div>

        {/* Center Scan Button - Elevated FAB */}
        <Link
          href="/create"
          className="
            absolute left-1/2 -translate-x-1/2 -top-8
            flex items-center justify-center
            w-16 h-16
            bg-[#0066FF]
            rounded-full shadow-xl shadow-blue-500/30
            active:scale-95 touch-manipulation
            transition-transform duration-200
            ring-4 ring-white
          "
          aria-label="Scan receipt"
        >
          <ScanLine size={28} color="white" strokeWidth={2} />
        </Link>

        {/* Right Nav Items */}
        <div className="flex items-center justify-around flex-1">
          {rightNavItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`
                  flex flex-col items-center gap-1 px-3 py-2
                  min-w-[60px]
                  transition-colors duration-200 rounded-lg
                  active:scale-95 touch-manipulation
                  ${isActive ? 'text-blue-600' : 'text-gray-600 active:text-blue-600'}
                `}
              >
                {item.isAvatar ? (
                  <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${avatar.imageUrl ? 'bg-gray-100' : avatar.color} flex items-center justify-center text-xs overflow-hidden ${isActive ? 'ring-2 ring-blue-600 ring-offset-1' : ''}`}>
                    {avatar.imageUrl ? (
                      <img 
                        src={avatar.imageUrl} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{avatar.emoji}</span>
                    )}
                  </div>
                ) : Icon ? (
                  <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                ) : null}
                <span className="text-xs font-medium whitespace-nowrap">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
