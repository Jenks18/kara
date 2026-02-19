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
    { id: 'home', label: 'Home', icon: Home, href: '/' },
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
        bg-white/80 backdrop-blur-lg border-t border-blue-200
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

        {/* Center Scan Button - Elevated */}
        <Link
          href="/create"
          className="
            flex items-center justify-center
            w-14 h-14 -mt-8
            bg-gradient-to-br from-blue-500 to-blue-600
            rounded-full shadow-lg
            active:scale-95 touch-manipulation
            transition-transform duration-200
          "
          aria-label="Scan receipt"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5C10.9 5 10 5.9 10 7C10 8.1 10.9 9 12 9C13.1 9 14 8.1 14 7C14 5.9 13.1 5 12 5Z" fill="white"/>
            <path d="M20 4H16.83L15.59 2.65C15.22 2.24 14.68 2 14.12 2H9.88C9.32 2 8.78 2.24 8.4 2.65L7.17 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM12 17C8.69 17 6 14.31 6 11C6 7.69 8.69 5 12 5C15.31 5 18 7.69 18 11C18 14.31 15.31 17 12 17Z" fill="white"/>
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
