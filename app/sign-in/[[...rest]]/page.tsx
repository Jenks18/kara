import { SignIn } from '@clerk/nextjs'

export default function SignInPage({
  searchParams,
}: {
  searchParams: { mobile?: string }
}) {
  // If coming from mobile app, redirect to mobile-redirect endpoint after sign in
  const isMobile = searchParams.mobile === 'android'
  const redirectUrl = isMobile ? '/api/auth/android-callback' : '/reports'
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100 p-4">
      <div className="w-full max-w-md">
        <SignIn 
          appearance={{
            elements: {
              rootBox: 'w-full',
              card: 'bg-white shadow-none border-0',
              headerTitle: 'text-gray-900',
              headerSubtitle: 'text-gray-600',
              socialButtonsBlockButton: 'border-gray-200 hover:bg-gray-50',
              formButtonPrimary: 'bg-emerald-600 hover:bg-emerald-700',
              formFieldInput: 'border-gray-200 focus:border-emerald-500 focus:ring-emerald-500',
              footerActionLink: 'text-emerald-600 hover:text-emerald-700'
            }
          }}
          signUpUrl="/sign-up"
          redirectUrl={redirectUrl}
          routing="hash"
        />
      </div>
    </div>
  )
}
