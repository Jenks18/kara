import type { Metadata, Viewport } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Providers } from '@/components/Providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'Kacha - Receipt Capture & Expense Tracking',
  description: 'Capture receipts, track expenses, and generate reports — for individuals and teams. Kacha simplifies financial record-keeping.',
  manifest: '/manifest.json',
  metadataBase: new URL('https://www.mafutapass.com'),
  keywords: ['receipt scanner', 'expense tracker', 'receipt capture', 'expense management', 'business expenses', 'receipt management'],
  openGraph: {
    title: 'Kacha - Receipt Capture & Expense Tracking',
    description: 'Capture receipts, track expenses, and generate reports — for individuals and teams.',
    siteName: 'Kacha',
    type: 'website',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Kacha',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#0066FF',
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          {/* Theme initialization — runs before paint to prevent flash */}
          <script dangerouslySetInnerHTML={{ __html: `
            (function() {
              try {
                var t = localStorage.getItem('kacha_theme');
                if (t === 'dark') {
                  document.documentElement.classList.add('dark');
                } else if (t === 'system') {
                  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    document.documentElement.classList.add('dark');
                  }
                }
              } catch(e) {}
            })();
          `}} />
        </head>
        <body suppressHydrationWarning>
          <Providers>{children}</Providers>
        </body>
      </html>
    </ClerkProvider>
  )
}
