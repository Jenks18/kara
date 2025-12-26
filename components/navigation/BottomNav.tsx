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
    <nav className="
      fixed bottom-0 left-0 right-0
      bg-dark-100 border-t border-gray-800
      px-2 py-3
      safe-area-bottom
      z-40
    ">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`
                flex flex-col items-center gap-1 px-3 py-2
                transition-colors duration-200 rounded-lg
                ${isActive ? 'text-primary-400' : 'text-gray-400 hover:text-gray-300'}
              `}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
