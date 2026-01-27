'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { ChevronLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function DisplayNamePage() {
  const router = useRouter()
  const { user } = useUser()
  const [firstName, setFirstName] = useState(user?.firstName || '')
  const [lastName, setLastName] = useState(user?.lastName || '')

  const handleSave = async () => {
    // TODO: Update user profile via Clerk
    router.back()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 to-green-900" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-emerald-900/95 backdrop-blur-sm border-b border-emerald-700">
        <div className="px-4 py-4 max-w-md mx-auto flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 active:scale-95 transition-transform touch-manipulation"
          >
            <ChevronLeft size={24} className="text-gray-200" />
          </button>
          <h1 className="text-xl font-semibold text-white flex-1">Display name</h1>
        </div>
      </div>
      
      {/* Content */}
      <div className="px-4 py-6 max-w-md mx-auto space-y-6">
        <p className="text-gray-300 text-sm">
          Your display name is shown on your profile.
        </p>

        {/* First Name */}
        <div>
          <label className="block text-sm text-gray-300 mb-2">First name</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First name"
            className="w-full px-4 py-4 bg-emerald-800/50 border border-emerald-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 touch-manipulation"
          />
        </div>

        {/* Last Name */}
        <div>
          <label className="block text-sm text-gray-300 mb-2">Last name</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last name"
            className="w-full px-4 py-4 bg-emerald-800/50 border border-emerald-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 touch-manipulation"
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-emerald-900/95 backdrop-blur-sm border-t border-emerald-700">
        <button
          onClick={handleSave}
          className="w-full max-w-md mx-auto py-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl text-white font-semibold text-lg active:scale-[0.98] transition-all touch-manipulation"
        >
          Save
        </button>
      </div>
    </div>
  )
}
