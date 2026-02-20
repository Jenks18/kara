'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, FileText, Briefcase } from 'lucide-react'
import { useAvatar } from '@/contexts/AvatarContext'

export default function BottomNav() {
  const pathname = usePathname()
  const { avatar } = useAvatar()
  
  const leftNavItems = [
    { id: 'home', label: 'Home', icon: Home, href: '/home' },
    { id: 'reports', label: 'Reports', icon: FileText, href: '/reports' },
  ]
  
  const rightNavItems = [
    { id: 'workspaces', label: 'Workspaces', icon: Briefcase, href: '/workspaces' },
    { id: 'account', label: 'Account', icon: null, href: '/account', isAvatar: true },
  ]
  
  return (
    <nav 
      className="
        fixed bottom-0 left-0 right-0
        bg-white border-t border-blue-200
        z-40
        shadow-lg
      "
      style={{
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))'
      }}
    >
      <div className="relative flex items-end justify-around max-w-md mx-auto py-2 px-2">
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
            flex items-center justify-center
            w-16 h-16 -mt-10
            bg-[#0066FF]
            rounded-full shadow-xl shadow-blue-500/30
            active:scale-95 touch-manipulation
            transition-transform duration-200
            ring-4 ring-white
          "
          aria-label="Scan receipt"
        >
          {/* QR Code Icon */}
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="3" width="8" height="8" rx="1" stroke="white" strokeWidth="2"/>
            <rect x="5" y="5" width="4" height="4" fill="white"/>
            <rect x="13" y="3" width="8" height="8" rx="1" stroke="white" strokeWidth="2"/>
            <rect x="15" y="5" width="4" height="4" fill="white"/>
            <rect x="3" y="13" width="8" height="8" rx="1" stroke="white" strokeWidth="2"/>
            <rect x="5" y="15" width="4" height="4" fill="white"/>
            <rect x="13" y="13" width="4" height="4" fill="white"/>
            <rect x="19" y="13" width="2" height="2" fill="white"/>
            <rect x="13" y="19" width="2" height="2" fill="white"/>
            <rect x="17" y="17" width="4" height="4" fill="white"/>
          </svg>
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
