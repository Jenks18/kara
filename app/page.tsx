import { redirect } from 'next/navigation'

// Inbox/chat feature not implemented yet
// Redirect to reports page as default landing page
export default function HomePage() {
  redirect('/reports')
}
