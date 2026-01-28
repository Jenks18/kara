import { SignUp } from '@clerk/nextjs'

export const dynamic = 'force-dynamic'

export default function SignUpPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100">
      <div className="w-full max-w-md px-4">
        <SignUp 
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-2xl"
            }
          }}
        />
      </div>
    </div>
  )
}
