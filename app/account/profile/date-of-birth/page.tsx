'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { ChevronLeft } from 'lucide-react'
import { getUserProfile, updateUserProfile } from '@/lib/api/user-profiles'

export const dynamic = 'force-dynamic'

export default function DateOfBirthPage() {
  const router = useRouter()
  const { user } = useUser()
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProfile() {
      if (!user?.id) return
      
      try {
        const profile = await getUserProfile(user.id)
        if (profile) {
          setDateOfBirth(profile.date_of_birth || '')
        }
      } catch (error) {
        console.error('Error loading date of birth:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadProfile()
  }, [user?.id])

  const handleSave = async () => {
    if (!user?.id) return
    
    setSaving(true)
    try {
      await updateUserProfile(user.id, {
        date_of_birth: dateOfBirth,
        user_email: user.emailAddresses[0]?.emailAddress || '',
      })
      console.log('✅ Date of birth saved')
      router.back()
    } catch (error) {
      console.error('Error saving date of birth:', error)
      alert('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="px-4 py-4 max-w-md mx-auto flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 -ml-2 active:scale-95 transition-transform touch-manipulation">
            <ChevronLeft size={24} className="text-gray-700" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900 flex-1">Date of birth</h1>
        </div>
      </div>
      
      <div className="px-4 py-6 max-w-md mx-auto space-y-6">
        <p className="text-gray-600 text-sm">
          Your date of birth is never shown on your public profile.
        </p>

        <div>
          <label className="block text-sm text-gray-700 mb-2">Date of birth</label>
          <input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            className="w-full px-4 py-4 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 touch-manipulation"
          />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/95 backdrop-blur-sm border-t border-gray-200">
        <button 
          onClick={handleSave}
          disabled={saving}
          className="w-full max-w-md mx-auto py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-400 rounded-2xl text-white font-semibold text-lg active:scale-[0.98] transition-all touch-manipulation"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}
