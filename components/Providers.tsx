'use client'

import { usePathname } from 'next/navigation'
import { AvatarProvider } from '@/contexts/AvatarContext'
import { UserProfileInit } from './UserProfileInit'
import { AutoProfileSetup } from './AutoProfileSetup'

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuthPage = pathname?.startsWith('/sign-in') || pathname?.startsWith('/sign-up')
  
  // Skip all providers on auth pages to prevent interference with Clerk
  if (isAuthPage) {
    return <>{children}</>
  }
  
  return (
    <AvatarProvider>
      <AutoProfileSetup />
      <UserProfileInit />
      {children}
    </AvatarProvider>
  )
}
