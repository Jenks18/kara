import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/',
])

const isProtectedRoute = createRouteMatcher([
  '/create(.*)',
  '/reports(.*)',
  '/api/expense(.*)',
])

// Workspace and account routes are NOT protected during development
// Uncomment these when ready to enforce auth:
// '/workspaces(.*)',
// '/account(.*)',
// '/api/workspaces(.*)',

export default clerkMiddleware(async (auth, req) => {
  // Allow public routes without auth
  if (isPublicRoute(req)) {
    return
  }
  
  // Protect specific routes
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
}, {
  signInUrl: '/sign-in',
  signUpUrl: '/sign-up',
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
