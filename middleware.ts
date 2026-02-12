import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/auth/google-native(.*)',
  '/api/auth/verify-token(.*)',
])

export default clerkMiddleware(
  async (auth, req) => {
    // Allow public API routes without authentication
    if (isPublicRoute(req)) {
      return NextResponse.next()
    }
    
    // Check for mobile app sign-in token in Authorization header
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const clerk = await clerkClient();
        const verifiedToken = await clerk.signInTokens.verifyToken({ token });
        console.log('✅ Mobile auth verified for user:', verifiedToken.userId);
        
        // Add userId to request headers so API routes can access it
        const requestHeaders = new Headers(req.headers);
        requestHeaders.set('x-clerk-user-id', verifiedToken.userId);
        
        return NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });
      } catch (error) {
        console.error('❌ Mobile token verification failed:', error);
        return NextResponse.json(
          { error: 'Invalid authentication token' },
          { status: 401 }
        );
      }
    }
    
    // Redirect root to reports (inbox disabled)
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
    
    // Protect all other routes with standard Clerk auth
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
