import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/auth/google-native(.*)',
  '/api/auth/signup(.*)', // Email/password sign-up for mobile
  '/api/auth/verify-token(.*)',
  '/api/user-profile(.*)', // Profile API for mobile
  '/api/update-username(.*)', // Username update for mobile
  '/api/mobile/(.*)', // Mobile-specific API routes
])

export default clerkMiddleware(
  async (auth, req) => {
    // Allow public API routes and onboarding without authentication
    if (isPublicRoute(req)) {
      return NextResponse.next()
    }
    
    // Redirect root to reports
    if (req.nextUrl.pathname === '/') {
      const { userId } = await auth()
      if (userId) {
        // Logged in users go to reports
        return NextResponse.redirect(new URL('/reports', req.url))
      } else {
        // Not logged in, allow access to sign in
        return NextResponse.next()
      }
    }
    
    // Protect all other routes
    await auth.protect()
  }
)

export const config = {
  matcher: [
    '/((?!.*\\..*|_next|api/auth/google-native).*)',
    '/',
    '/(api|trpc)((?!/auth/google-native).*)'
  ],
}
