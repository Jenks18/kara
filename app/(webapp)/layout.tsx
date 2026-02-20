import { ClerkProvider } from '@clerk/nextjs'
import { Providers } from '@/components/Providers'

export const metadata = {
  title: 'Kacha App - Receipt Capture & Expense Tracking',
  description: 'Manage your receipts, expenses, and reports. Built for individuals and teams.',
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <Providers>{children}</Providers>
    </ClerkProvider>
  )
}
