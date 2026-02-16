import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'

// Landing page for non-authenticated users
// Authenticated users get redirected to reports
export default async function HomePage() {
  const { userId } = await auth()
  
  if (userId) {
    // Logged in users go to reports
    redirect('/reports')
  }
  
  // Non-authenticated users see the public landing page
  redirect('/welcome')
}
