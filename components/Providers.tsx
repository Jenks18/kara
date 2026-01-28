'use client'

import { usePathname } from 'next/navigation'
import { AvatarProvider } from '@/contexts/AvatarContext'
import { UserProfileInit } from './UserProfileInit'

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuthPage = pathname?.startsWith('/sign-in') || pathname?.startsWith('/sign-up')
  
  return (
    <AvatarProvider>
      {!isAuthPage && <UserProfileInit />}
      {children}
    </AvatarProvider>
  )
}
