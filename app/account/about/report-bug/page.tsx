'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { ChevronLeft, Bug, CheckCircle, Loader2, Camera } from 'lucide-react'

export const dynamic = 'force-dynamic'

const BUG_CATEGORIES = [
  { id: 'receipt_scanning', label: 'Receipt scanning', description: 'Camera, image processing, or OCR issues' },
  { id: 'expense_reports', label: 'Expense reports', description: 'Creating, editing, or submitting reports' },
  { id: 'workspaces', label: 'Workspaces', description: 'Team workspaces, invitations, or permissions' },
  { id: 'account', label: 'Account & profile', description: 'Login, profile settings, or preferences' },
  { id: 'performance', label: 'Performance', description: 'App is slow, crashes, or freezes' },
  { id: 'display', label: 'Display issues', description: 'Layout problems, missing content, or visual glitches' },
  { id: 'other', label: 'Other', description: 'Something else not listed above' },
]

const SEVERITY_OPTIONS = [
  { id: 'low', label: 'Low', description: 'Minor inconvenience', color: 'bg-green-100 text-green-700 border-green-200' },
  { id: 'medium', label: 'Medium', description: 'Affects usability', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: 'high', label: 'High', description: 'Cannot complete task', color: 'bg-red-100 text-red-700 border-red-200' },
]

export default function ReportBugPage() {
  const router = useRouter()
  const { user } = useUser()
  const [category, setCategory] = useState('')
  const [severity, setSeverity] = useState('medium')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [steps, setSteps] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!category) {
      setError('Please select a bug category')
      return
    }
    if (!title.trim()) {
      setError('Please provide a brief title')
      return
    }
    if (!description.trim()) {
      setError('Please describe the issue')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/account/report-bug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          severity,
          title: title.trim(),
          description: description.trim(),
          stepsToReproduce: steps.trim(),
          userEmail: user?.emailAddresses?.[0]?.emailAddress,
          userAgent: navigator.userAgent,
          screenSize: `${window.innerWidth}x${window.innerHeight}`,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit report')
      }

      setIsSubmitted(true)
    } catch (err) {
      setError('Failed to submit report. Please try again or email masomonews19@gmail.com')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100">
        <div className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="px-4 py-4 max-w-md mx-auto flex items-center gap-4">
            <button onClick={() => router.replace('/account/about')} className="p-2 -ml-2 active:scale-95 transition-transform touch-manipulation">
              <ChevronLeft size={24} className="text-gray-700" />
            </button>
            <Bug size={24} className="text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900 flex-1">Bug reported</h1>
          </div>
        </div>

        <div className="px-4 py-12 max-w-md mx-auto text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Thank you!</h2>
          <p className="text-gray-600 mb-2">
            Your bug report has been received. Our team will investigate and work on a fix.
          </p>
          <p className="text-gray-500 text-sm mb-8">
            Our team will follow up at <span className="font-medium text-gray-700">masomonews19@gmail.com</span>
          </p>
          <button
            onClick={() => router.replace('/account/about')}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl text-white font-semibold text-lg active:scale-[0.98] transition-all touch-manipulation"
          >
            Back to About
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
          <Bug size={24} className="text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900 flex-1">Report a bug</h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 max-w-md mx-auto space-y-6">
        {/* Category */}
        <div className="space-y-3">
          <h2 className="text-gray-900 font-semibold">Category</h2>
          <div className="space-y-2">
            {BUG_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => { setCategory(cat.id); setError('') }}
                className={`w-full bg-white rounded-xl border p-3.5 text-left active:bg-gray-50 transition-colors shadow-sm touch-manipulation ${
                  category === cat.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                    category === cat.id ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                  }`}>
                    {category === cat.id && (
                      <div className="w-full h-full rounded-full flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{cat.label}</div>
                    <div className="text-xs text-gray-500">{cat.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Severity */}
        <div className="space-y-3">
          <h2 className="text-gray-900 font-semibold">Severity</h2>
          <div className="flex gap-2">
            {SEVERITY_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setSeverity(opt.id)}
                className={`flex-1 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors touch-manipulation ${
                  severity === opt.id 
                    ? opt.color
                    : 'bg-white border-gray-200 text-gray-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <label className="text-gray-900 font-semibold block">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setError('') }}
            placeholder="Brief summary of the issue"
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm touch-manipulation"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-gray-900 font-semibold block">Description</label>
          <textarea
            value={description}
            onChange={(e) => { setDescription(e.target.value); setError('') }}
            rows={4}
            placeholder="What happened? What did you expect to happen instead?"
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none shadow-sm touch-manipulation"
          />
        </div>

        {/* Steps to reproduce */}
        <div className="space-y-2">
          <label className="text-gray-900 font-semibold block">Steps to reproduce <span className="text-gray-400 font-normal">(optional)</span></label>
          <textarea
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            rows={3}
            placeholder="1. Go to...&#10;2. Tap on...&#10;3. See error..."
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
            'Submit Bug Report'
          )}
        </button>
      </div>
    </div>
  )
}
