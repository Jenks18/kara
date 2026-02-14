'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { ChevronLeft } from 'lucide-react'
import { getUserProfile, updateUserProfile } from '@/lib/api/user-profiles'

export const dynamic = 'force-dynamic'

export default function AddressPage() {
  const router = useRouter()
  const { user } = useUser()
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [country, setCountry] = useState('Kenya')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProfile() {
      if (!user?.id) return
      
      try {
        const profile = await getUserProfile(user.id)
        if (profile) {
          setAddressLine1(profile.address_line1 || '')
          setAddressLine2(profile.address_line2 || '')
          setCity(profile.city || '')
          setState(profile.state || '')
          setZipCode(profile.zip_code || '')
          setCountry(profile.country || 'Kenya')
        }
      } catch (error) {
        console.error('Error loading address:', error)
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
        address_line1: addressLine1,
        address_line2: addressLine2,
        city,
        state,
        zip_code: zipCode,
        country,
        user_email: user.emailAddresses[0]?.emailAddress || '',
      })
      router.back()
    } catch (error) {
      alert('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100" style={{ paddingBottom: 'calc(150px + env(safe-area-inset-bottom))' }}>
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="px-4 py-4 max-w-md mx-auto flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 -ml-2 active:scale-95 transition-transform touch-manipulation">
            <ChevronLeft size={24} className="text-gray-700" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900 flex-1">Address</h1>
        </div>
      </div>
      
      <div className="px-4 py-6 max-w-md mx-auto space-y-4">
        <div>
          <label className="block text-sm text-gray-700 mb-2">Address line 1</label>
          <input
            type="text"
            value={addressLine1}
            onChange={(e) => setAddressLine1(e.target.value)}
            placeholder="Address line 1"
            className="w-full px-4 py-4 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 touch-manipulation"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-2">Address line 2</label>
          <input
            type="text"
            value={addressLine2}
            onChange={(e) => setAddressLine2(e.target.value)}
            placeholder="Address line 2"
            className="w-full px-4 py-4 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 touch-manipulation"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-2">Country</label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full px-4 py-4 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 touch-manipulation"
          >
            <option value="Kenya">Kenya</option>
            <option value="United States">United States</option>
            <option value="United Kingdom">United Kingdom</option>
            <option value="Canada">Canada</option>
            <option value="Tanzania">Tanzania</option>
            <option value="Uganda">Uganda</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-2">State</label>
          <input
            type="text"
            value={state}
            onChange={(e) => setState(e.target.value)}
            placeholder="State"
            className="w-full px-4 py-4 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 touch-manipulation"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-2">City</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City"
            className="w-full px-4 py-4 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 touch-manipulation"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-2">Zip / Postcode</label>
          <input
            type="text"
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
            placeholder="Zip / Postcode"
            className="w-full px-4 py-4 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 touch-manipulation"
          />
          <p className="text-xs text-gray-500 mt-2">e.g. 12345, 12345-1234, 12345 1234</p>
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
