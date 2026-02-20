import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Account — Kacha',
  description: 'Manage your Kacha account settings, profile, preferences, and security options.',
}

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
