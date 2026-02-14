import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/auth/google-native(.*)',
  '/api/auth/complete-google-signup(.*)', // Google OAuth username completion
  '/api/auth/signup(.*)', // Email/password sign-up for mobile
  '/api/auth/verify-email(.*)', // Email verification
  '/api/auth/create-profile(.*)', // Profile creation after email verification
  '/api/auth/mobile-signup(.*)', // Backend sign-up (bypasses CAPTCHA)
  '/api/auth/mobile-signin(.*)', // Backend sign-in (handles email verification)
  '/api/auth/mobile-profile(.*)', // Mobile profile fetch/update (auth'd via Bearer token)
  '/api/auth/exchange-token(.*)', // Backend proxy for token exchange (bypasses Cloudflare)
  '/api/user-profile(.*)', // Profile API (init + OPTIONS)
  '/api/update-username(.*)', // Username update (auth'd via Clerk session)
  '/api/mobile/(.*)', // Mobile-specific API routes (auth'd via Bearer token)
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
