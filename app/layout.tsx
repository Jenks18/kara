import type { Metadata, Viewport } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

export const metadata: Metadata = {
  title: 'MafutaPass - Premium Fuel Expense Tracker',
  description: 'AI-powered fuel expense tracking for businesses in Kenya',
  manifest: '/manifest.json',
  metadataBase: new URL('https://www.mafutapass.com'),
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MafutaPass',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0c1710',
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        </head>
        <body className="overflow-x-hidden">{children}</body>
      </html>
    </ClerkProvider>
  )
}
