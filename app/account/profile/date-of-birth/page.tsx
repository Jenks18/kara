'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { ChevronLeft } from 'lucide-react'
import { getUserProfile, updateUserProfile } from '@/lib/api/user-profiles'

export const dynamic = 'force-dynamic'

// Format ISO date (yyyy-MM-dd) to Kenyan display (dd/MM/yyyy)
function formatDateKenyan(isoDate: string): string {
  if (!isoDate) return ''
  const parts = isoDate.split('-')
  if (parts.length !== 3) return isoDate
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

// Parse Kenyan format (dd/MM/yyyy) to ISO (yyyy-MM-dd)
function parseDateKenyan(kenyan: string): string {
  const parts = kenyan.split('/')
  if (parts.length !== 3) return kenyan
  return `${parts[2]}-${parts[1]}-${parts[0]}`
}

export default function DateOfBirthPage() {
  const router = useRouter()
  const { user } = useUser()
  const [day, setDay] = useState('')
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadProfile() {
      if (!user?.id) return
      
      try {
        const profile = await getUserProfile(user.id)
        if (profile?.date_of_birth) {
          const parts = profile.date_of_birth.split('-')
          if (parts.length === 3) {
            setYear(parts[0])
            setMonth(parts[1])
            setDay(parts[2])
          }
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
    setError('')
    
    // Validate
    if (day || month || year) {
      const d = parseInt(day), m = parseInt(month), y = parseInt(year)
      if (!d || !m || !y || d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > new Date().getFullYear()) {
        setError('Please enter a valid date')
        return
      }
    }
    
    const isoDate = (day && month && year) 
      ? `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      : ''
    
    setSaving(true)
    try {
      await updateUserProfile(user.id, {
        date_of_birth: isoDate,
        user_email: user.emailAddresses[0]?.emailAddress || '',
      })
      router.back()
    } catch (error) {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ]

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

        <div className="space-y-4">
          <div className="flex gap-3">
            {/* Day */}
            <div className="flex-1">
              <label className="block text-sm text-gray-700 mb-2">Day</label>
              <input
                type="text"
                inputMode="numeric"
                value={day}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^\d]/g, '')
                  if (val.length <= 2) { setDay(val); setError('') }
                }}
                placeholder="DD"
                className="w-full px-4 py-4 bg-white border border-gray-300 rounded-xl text-gray-900 text-center focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 touch-manipulation"
              />
            </div>
            
            {/* Month */}
            <div className="flex-[2]">
              <label className="block text-sm text-gray-700 mb-2">Month</label>
              <select
                value={month}
                onChange={(e) => { setMonth(e.target.value); setError('') }}
                className="w-full px-4 py-4 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 touch-manipulation appearance-none"
              >
                <option value="">Month</option>
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            
            {/* Year */}
            <div className="flex-1">
              <label className="block text-sm text-gray-700 mb-2">Year</label>
              <input
                type="text"
                inputMode="numeric"
                value={year}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^\d]/g, '')
                  if (val.length <= 4) { setYear(val); setError('') }
                }}
                placeholder="YYYY"
                className="w-full px-4 py-4 bg-white border border-gray-300 rounded-xl text-gray-900 text-center focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 touch-manipulation"
              />
            </div>
          </div>
          
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          
          <p className="text-xs text-gray-500">
            Format: Day / Month / Year (e.g. 14 / February / 1990)
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
