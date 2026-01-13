import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

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
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
