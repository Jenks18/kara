import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100 p-4">
      <div className="w-full max-w-md">
        <SignUp />
      </div>
    </div>
  )
}
