import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Kara - Fuel Expense Tracker',
  description: 'Track your fuel expenses in Kenya',
  manifest: '/manifest.json',
  themeColor: '#0c1710',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
