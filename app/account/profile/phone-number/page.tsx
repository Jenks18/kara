'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { ChevronLeft } from 'lucide-react'
import { getUserProfile, updateUserProfile } from '@/lib/api/user-profiles'

export const dynamic = 'force-dynamic'

export default function PhoneNumberPage() {
  const router = useRouter()
  const { user } = useUser()
  const [localNumber, setLocalNumber] = useState('')  // digits after +254
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadProfile() {
      if (!user?.id) return
      
      try {
        const profile = await getUserProfile(user.id)
        if (profile?.phone_number) {
          // Strip +254 prefix if present, otherwise show full number
          const num = profile.phone_number.replace(/[\s\-]/g, '')
          if (num.startsWith('+254')) {
            setLocalNumber(num.substring(4))
          } else if (num.startsWith('254')) {
            setLocalNumber(num.substring(3))
          } else if (num.startsWith('0')) {
            setLocalNumber(num.substring(1))
          } else {
            setLocalNumber(num)
          }
        }
      } catch (error) {
        console.error('Error loading phone number:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadProfile()
  }, [user?.id])

  const handleSave = async () => {
    if (!user?.id) return
    
    setError('')
    
    if (localNumber && localNumber.trim()) {
      const cleaned = localNumber.replace(/[\s\-]/g, '')
      
      // Must start with 7 or 1 and be exactly 9 digits
      if (!/^[17]\d{8}$/.test(cleaned)) {
        setError('Enter a valid 9-digit Kenyan number starting with 7 or 1 (e.g. 712345678)')
        return
      }
    }
    
    const fullNumber = localNumber.trim() ? `+254${localNumber.replace(/[\s\-]/g, '')}` : ''
    
    setSaving(true)
    try {
      const result = await updateUserProfile(user.id, {
        phone_number: fullNumber,
        user_email: user.emailAddresses[0]?.emailAddress || '',
      })
      
      if (result) {
        router.back()
      } else {
        setError('Failed to save. Please try again.')
      }
    } catch (err) {
      console.error('Save error:', err)
      setError('Failed to save. Please check your connection and try again.')
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
          <h1 className="text-xl font-semibold text-gray-900 flex-1">Phone number</h1>
        </div>
      </div>
      
      <div className="px-4 py-6 max-w-md mx-auto space-y-6">
        <p className="text-gray-600 text-sm">
          Your phone number is never shown on your public profile.
        </p>

        <div>
          <label className="block text-sm text-gray-700 mb-2">Phone number</label>
          <div className={`flex items-center bg-white border rounded-xl overflow-hidden ${
            error ? 'border-red-500 ring-2 ring-red-500' : 'border-gray-300 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500'
          }`}>
            <div className="px-4 py-4 bg-gray-50 border-r border-gray-300 flex items-center gap-2 select-none flex-shrink-0">
              <span className="text-lg">🇰🇪</span>
              <span className="text-gray-700 font-medium">+254</span>
            </div>
            <input
              type="tel"
              inputMode="numeric"
              value={localNumber}
              onChange={(e) => {
                // Only allow digits
                const val = e.target.value.replace(/[^\d]/g, '')
                if (val.length <= 9) {
                  setLocalNumber(val)
                  setError('')
                }
              }}
              placeholder="712345678"
              className="flex-1 px-4 py-4 text-gray-900 placeholder-gray-400 focus:outline-none touch-manipulation"
            />
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
          <p className="mt-2 text-xs text-gray-500">
            Enter your 9-digit Kenyan mobile number
          </p>
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
