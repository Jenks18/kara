import { redirect } from 'next/navigation'

// Inbox/chat feature not implemented yet
// Middleware redirects logged-in users to /reports
// This page only shows for non-authenticated users
export default function HomePage() {
  // Non-authenticated users see sign-in
  redirect('/sign-in')
}
