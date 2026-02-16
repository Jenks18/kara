'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowLeft, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function DeleteAccountPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [reason, setReason] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (confirmText.toLowerCase() !== 'delete my account') {
      setError('Please type "DELETE MY ACCOUNT" exactly to confirm')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/account/delete-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          email: user?.emailAddresses?.[0]?.emailAddress,
          reason: reason,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit deletion request')
      }

      setIsSubmitted(true)
    } catch (err) {
      setError('Failed to submit request. Please try again or contact support@mafutapass.com')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100">
        <div className="px-4 py-6 max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/account')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft size={20} />
              <span>Back to Account</span>
            </button>
          </div>

          {/* Success Message */}
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="w-16 h-16 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Request Submitted
            </h1>
            <p className="text-gray-600 mb-6">
              Your account deletion request has been received. We'll process your request within 30 days and send a confirmation email to:
            </p>
            <p className="font-semibold text-emerald-600 mb-6">
              {user?.emailAddresses?.[0]?.emailAddress}
            </p>
            <p className="text-sm text-gray-500">
              If you have any questions, please contact us at support@mafutapass.com
            </p>
            <button
              onClick={() => router.push('/account')}
              className="mt-8 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Return to Account
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100">
      <div className="px-4 py-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/account')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={20} />
            <span>Back to Account</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            Delete My Account
          </h1>
        </div>

        {/* Warning Box */}
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 mb-8">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-red-900 mb-2">
                This action cannot be undone
              </h2>
              <p className="text-red-800 text-sm">
                Deleting your account will permanently remove all your data from MafutaPass. This includes your profile, receipts, expense reports, and workspace memberships.
              </p>
            </div>
          </div>
        </div>

        {/* What Gets Deleted */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            What data will be deleted?
          </h2>
          <ul className="space-y-3 text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 mt-1">•</span>
              <span><strong>Profile Information:</strong> Your name, email, phone number, and profile settings</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 mt-1">•</span>
              <span><strong>Receipt Data:</strong> All uploaded receipts and their associated images</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 mt-1">•</span>
              <span><strong>Expense Reports:</strong> All expense reports and expense items</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 mt-1">•</span>
              <span><strong>Workspace Memberships:</strong> Your access to all workspaces</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 mt-1">•</span>
              <span><strong>Account Authentication:</strong> Your login credentials and sessions</span>
            </li>
          </ul>
        </div>

        {/* Data Retention */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Data retention
          </h2>
          <p className="text-gray-600 mb-4">
            After you request account deletion:
          </p>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 mt-1">•</span>
              <span>Your account will be deactivated immediately</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 mt-1">•</span>
              <span>All personal data will be permanently deleted within <strong>30 days</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 mt-1">•</span>
              <span>We may retain anonymized data for analytics and legal compliance</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 mt-1">•</span>
              <span>Transaction records may be kept for <strong>7 years</strong> for tax and legal purposes</span>
            </li>
          </ul>
        </div>

        {/* Deletion Request Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Request account deletion
          </h2>
          
          {/* Current User Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Account to be deleted:</p>
            <p className="font-semibold text-gray-900">{user?.emailAddresses?.[0]?.emailAddress}</p>
          </div>

          {/* Reason (Optional) */}
          <div className="mb-6">
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
              Why are you leaving? (Optional)
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Help us improve by sharing your feedback..."
            />
          </div>

          {/* Confirmation */}
          <div className="mb-6">
            <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-2">
              Type <strong>DELETE MY ACCOUNT</strong> to confirm
            </label>
            <input
              id="confirm"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="DELETE MY ACCOUNT"
              required
            />
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Submitting Request...</span>
              </>
            ) : (
              <span>Delete My Account</span>
            )}
          </button>
        </form>

        {/* Support Contact */}
        <div className="text-center text-sm text-gray-600">
          <p>Need help? Contact us at{' '}
            <a href="mailto:support@mafutapass.com" className="text-emerald-600 hover:text-emerald-700 font-medium">
              support@mafutapass.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
