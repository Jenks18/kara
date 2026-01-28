import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  // Allow public routes without auth  
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
}, {
  signInUrl: '/sign-in',
  signUpUrl: '/sign-up',
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
