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
      <Providers>
        {/* Constrain webapp to mobile form factor on all screen sizes */}
        <div className="bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100 min-h-screen">
          <div className="max-w-[430px] mx-auto relative min-h-screen min-h-[100dvh]">
            {children}
          </div>
        </div>
      </Providers>
    </ClerkProvider>
  )
}
