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
  const [phoneNumber, setPhoneNumber] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadProfile() {
      if (!user?.id) return
      
      try {
        const profile = await getUserProfile(user.id)
        if (profile) {
          setPhoneNumber(profile.phone_number || '')
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
    
    // Basic phone validation
    if (phoneNumber && phoneNumber.trim()) {
      // Remove spaces and special chars for validation
      const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '')
      
      // Check if it starts with + and has digits
      if (!cleaned.startsWith('+')) {
        setError('Phone number must start with country code (e.g., +254)')
        return
      }
      
      // Check for valid length (10-15 digits after +)
      const digits = cleaned.substring(1)
      if (!/^\d{10,15}$/.test(digits)) {
        setError('Please enter a valid phone number (10-15 digits)')
        return
      }
    }
    
    setSaving(true)
    try {
      const result = await updateUserProfile(user.id, {
        phone_number: phoneNumber.trim(),
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
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => {
              setPhoneNumber(e.target.value)
              setError('') // Clear error when typing
            }}
            placeholder="+254 20 1234567"
            className={`w-full px-4 py-4 bg-white border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 touch-manipulation ${
              error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-emerald-500 focus:border-emerald-500'
            }`}
          />
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
          <p className="mt-2 text-xs text-gray-500">
            Enter with country code (e.g., +254 for Kenya)
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
