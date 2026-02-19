import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100 p-4">
      <div className="w-full max-w-md">
        <SignUp 
          forceRedirectUrl="/reports"
          appearance={{
            elements: {
              rootBox: 'w-full',
              card: 'bg-white shadow-none border-0',
              headerTitle: 'text-gray-900',
              headerSubtitle: 'text-gray-600',
              socialButtonsBlockButton: 'border-gray-200 hover:bg-gray-50',
              formButtonPrimary: 'bg-blue-600 hover:bg-blue-700',
              formFieldInput: 'border-gray-200 focus:border-blue-500 focus:ring-blue-500',
              footerActionLink: 'text-blue-600 hover:text-blue-700'
            }
          }}
        />
      </div>
    </div>
  )
}
