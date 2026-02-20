import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/privacy-policy(.*)',
  '/terms-of-service(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/help(.*)',
  '/invites(.*)',
  '/api/invites/accept/(.*)',
  '/api/auth/google-native(.*)',
  '/api/auth/complete-google-signup(.*)', // Google OAuth username completion
  '/api/auth/signup(.*)', // Email/password sign-up for mobile
  '/api/auth/verify-email(.*)', // Email verification
  '/api/auth/create-profile(.*)', // Profile creation after email verification
  '/api/auth/mobile-signup(.*)', // Backend sign-up (bypasses CAPTCHA)
  '/api/auth/mobile-signin(.*)', // Backend sign-in (handles email verification)
  '/api/auth/mobile-profile(.*)', // Mobile profile fetch/update (auth'd via Bearer token)
  '/api/auth/mobile-refresh(.*)', // Mobile token refresh
  '/api/user-profile(.*)', // Profile API (init + OPTIONS)
  '/api/update-username(.*)', // Username update (auth'd via Clerk session)
  '/api/mobile/(.*)', // Mobile-specific API routes (auth'd via Bearer token)
])

function getHostnameType(req: NextRequest): 'webapp' | 'marketing' {
  const hostname = req.headers.get('host') || ''
  const { pathname } = req.nextUrl
  
  // Check for web subdomain (web.kachalabs.com)
  if (hostname.startsWith('web.')) {
    return 'webapp'
  }
  
  // Check for localhost (development)
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    // During development, route based on path
    // Webapp routes: /home, /workspaces, /create, /reports, /account, /test-qr, /invites, /help, /sign-in, /sign-up
    if (pathname.startsWith('/home') || 
        pathname.startsWith('/workspaces') || 
        pathname.startsWith('/create') || 
        pathname.startsWith('/reports') || 
        pathname.startsWith('/account') ||
        pathname.startsWith('/test-qr') ||
        pathname.startsWith('/sign-in') ||
        pathname.startsWith('/sign-up')) {
      return 'webapp'
    }
    // Everything else is marketing
    return 'marketing'
  }
  
  // Default to marketing for main domain
  return 'marketing'
}

export default clerkMiddleware(
  async (auth, req) => {
    const url = req.nextUrl
    const hostname = req.headers.get('host') || ''
    const hostnameType = getHostnameType(req)
    
    // Handle subdomain routing
    if (hostnameType === 'webapp') {
      // web.kachalabs.com → serve webapp routes
      // If visiting root of web subdomain, redirect to /home
      if (url.pathname === '/') {
        url.pathname = '/home'
        return NextResponse.redirect(url)
      }
    } else if (hostnameType === 'marketing') {
      // kachalabs.com → serve marketing site
      // If someone tries to access webapp routes from main domain, redirect to web subdomain
      if ((url.pathname.startsWith('/home') || 
           url.pathname.startsWith('/workspaces') ||
           url.pathname.startsWith('/create') ||
           url.pathname.startsWith('/reports') ||
           url.pathname.startsWith('/account') ||
           url.pathname.startsWith('/test-qr')) && 
          !url.pathname.startsWith('/api/')) {
        // In production, redirect to web subdomain
        if (!hostname.includes('localhost')) {
          const webUrl = new URL(url)
          webUrl.host = `web.${hostname}`
          return NextResponse.redirect(webUrl)
        }
      }
    }
    
    // Allow public API routes and onboarding without authentication
    if (isPublicRoute(req)) {
      return NextResponse.next()
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
