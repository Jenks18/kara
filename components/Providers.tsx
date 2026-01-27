'use client'

import { AvatarProvider } from '@/contexts/AvatarContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return <AvatarProvider>{children}</AvatarProvider>
}
