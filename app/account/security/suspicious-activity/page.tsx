'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { ChevronLeft, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

const ACTIVITY_TYPES = [
  { id: 'unauthorized_login', label: 'Unauthorized login', description: 'Someone accessed my account without my knowledge' },
  { id: 'unknown_transactions', label: 'Unknown transactions', description: 'I see receipts or expenses I did not create' },
  { id: 'profile_changes', label: 'Unexpected profile changes', description: 'My profile details were changed without my consent' },
  { id: 'suspicious_email', label: 'Suspicious emails', description: 'I received unusual emails claiming to be from Kacha' },
  { id: 'workspace_access', label: 'Unauthorized workspace access', description: 'Someone joined or modified my workspace without permission' },
  { id: 'other', label: 'Other', description: 'Something else seems off with my account' },
]

export default function SuspiciousActivityPage() {
  const router = useRouter()
  const { user } = useUser()
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState('')

  const toggleType = (id: string) => {
    setSelectedTypes(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    )
    setError('')
  }

  const handleSubmit = async () => {
    if (selectedTypes.length === 0) {
      setError('Please select at least one type of suspicious activity')
      return
    }
    if (!description.trim()) {
      setError('Please describe what happened')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/account/suspicious-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityTypes: selectedTypes,
          description: description.trim(),
          userEmail: user?.emailAddresses?.[0]?.emailAddress,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit report')
      }

      setIsSubmitted(true)
    } catch (err) {
      setError('Failed to submit report. Please try again or contact support@mafutapass.com')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100">
        <div className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="px-4 py-4 max-w-md mx-auto flex items-center gap-4">
            <button onClick={() => router.push('/account/security')} className="p-2 -ml-2 active:scale-95 transition-transform touch-manipulation">
              <ChevronLeft size={24} className="text-gray-700" />
            </button>
            <AlertTriangle size={24} className="text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900 flex-1">Report submitted</h1>
          </div>
        </div>

        <div className="px-4 py-12 max-w-md mx-auto text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Thank you for reporting</h2>
          <p className="text-gray-600 mb-2">
            Our security team will review your report and take appropriate action.
          </p>
          <p className="text-gray-500 text-sm mb-8">
            You will receive an update at <span className="font-medium text-gray-700">{user?.emailAddresses?.[0]?.emailAddress}</span>
          </p>
          <button
            onClick={() => router.push('/account/security')}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl text-white font-semibold text-lg active:scale-[0.98] transition-all touch-manipulation"
          >
            Back to Security
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100" style={{ paddingBottom: 'calc(120px + env(safe-area-inset-bottom))' }}>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="px-4 py-4 max-w-md mx-auto flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 -ml-2 active:scale-95 transition-transform touch-manipulation">
            <ChevronLeft size={24} className="text-gray-700" />
          </button>
          <AlertTriangle size={24} className="text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900 flex-1">Report suspicious activity</h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 max-w-md mx-auto space-y-6">
        {/* Warning banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-900 text-sm font-medium">If you believe your account has been compromised, change your password immediately.</p>
              <p className="text-amber-700 text-xs mt-1">You can do this through your sign-in provider settings.</p>
            </div>
          </div>
        </div>

        {/* Activity type selection */}
        <div className="space-y-3">
          <h2 className="text-gray-900 text-lg font-semibold">What type of activity did you notice?</h2>
          <p className="text-gray-500 text-sm">Select all that apply.</p>

          <div className="space-y-2">
            {ACTIVITY_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => toggleType(type.id)}
                className={`w-full bg-white rounded-xl border p-4 text-left active:bg-gray-50 transition-colors shadow-sm touch-manipulation ${
                  selectedTypes.includes(type.id) ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center ${
                    selectedTypes.includes(type.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                  }`}>
                    {selectedTypes.includes(type.id) && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{type.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{type.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-gray-900 text-lg font-semibold block">Describe what happened</label>
          <p className="text-gray-500 text-sm">Include dates, times, and any other relevant details.</p>
          <textarea
            value={description}
            onChange={(e) => { setDescription(e.target.value); setError('') }}
            rows={5}
            placeholder="I noticed unusual activity on my account when..."
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none shadow-sm touch-manipulation"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Fixed bottom button */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/95 backdrop-blur-sm border-t border-gray-200" style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full max-w-md mx-auto block py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-400 rounded-2xl text-white font-semibold text-lg active:scale-[0.98] transition-all touch-manipulation"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={20} className="animate-spin" />
              Submitting...
            </span>
          ) : (
            'Submit Report'
          )}
        </button>
      </div>
    </div>
  )
}
