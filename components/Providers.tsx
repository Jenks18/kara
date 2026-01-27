'use client'

import { AvatarProvider } from '@/contexts/AvatarContext'
import { UserProfileInit } from './UserProfileInit'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AvatarProvider>
      <UserProfileInit />
      {children}
    </AvatarProvider>
  )
}
