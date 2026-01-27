'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, FileText, PlusCircle, Briefcase, User } from 'lucide-react'

export default function BottomNav() {
  const pathname = usePathname()
  
  const navItems = [
    { id: 'inbox', label: 'Inbox', icon: Home, href: '/' },
    { id: 'reports', label: 'Reports', icon: FileText, href: '/reports' },
    { id: 'create', label: 'Create', icon: PlusCircle, href: '/create' },
    { id: 'workspaces', label: 'Workspaces', icon: Briefcase, href: '/workspaces' },
    { id: 'account', label: 'Account', icon: User, href: '/account' },
  ]
  
  return (
    <nav 
      className="
        fixed bottom-0 left-0 right-0
        bg-white/80 backdrop-blur-lg border-t border-emerald-200
        px-2
        z-40
        shadow-lg
      "
      style={{
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))'
      }}
    >
      <div className="flex items-center justify-around max-w-md mx-auto py-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`
                flex flex-col items-center gap-1 px-3 py-2
                min-w-[60px] min-h-[56px]
                transition-colors duration-200 rounded-lg
                active:scale-95 touch-manipulation
                ${isActive ? 'text-emerald-600' : 'text-emerald-600 active:text-emerald-700'}
              `}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-xs font-medium whitespace-nowrap">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
