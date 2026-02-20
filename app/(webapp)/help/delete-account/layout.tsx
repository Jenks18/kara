import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Delete Your Account - Kacha',
  description: 'Learn how to delete your Kacha account and all associated data.',
}

export default function DeleteAccountHelpLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
