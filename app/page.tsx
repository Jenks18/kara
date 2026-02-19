import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import HomeClient from './HomeClient'

// Home page shows dashboard for authenticated users
// Non-authenticated users see welcome page
export default async function HomePage() {
  const { userId } = await auth()
  
  if (!userId) {
    // Non-authenticated users see the public landing page
    redirect('/welcome')
  }
  
  return <HomeClient />
}
