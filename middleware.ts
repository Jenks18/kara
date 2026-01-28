import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
])

export default clerkMiddleware(
  (auth, req) => {
    // Protect all routes except sign-in/sign-up
    if (!isPublicRoute(req)) {
      auth.protect()
    }
  },
  {
    signInUrl: '/sign-in',
  }
)

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
