'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { ChevronLeft, Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PasswordStrength {
  score: number      // 0-4
  label: string
  color: string
}

function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: '', color: '' }
  let score = 0
  if (password.length >= 8)  score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  const levels: PasswordStrength[] = [
    { score: 0, label: '',         color: '' },
    { score: 1, label: 'Weak',     color: 'text-red-500' },
    { score: 2, label: 'Fair',     color: 'text-orange-500' },
    { score: 3, label: 'Good',     color: 'text-yellow-600' },
    { score: 4, label: 'Strong',   color: 'text-green-600' },
    { score: 5, label: 'Very strong', color: 'text-green-700' },
  ]
  return levels[score]
}

function StrengthBar({ score }: { score: number }) {
  return (
    <div className="flex gap-1 mt-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded-full transition-colors ${
            i <= score
              ? score <= 1 ? 'bg-red-500'
              : score <= 2 ? 'bg-orange-500'
              : score <= 3 ? 'bg-yellow-500'
              : 'bg-green-500'
              : 'bg-gray-200'
          }`}
        />
      ))}
    </div>
  )
}

export default function ChangePasswordPage() {
  const router = useRouter()
  const { user } = useUser()

  const [currentPassword, setCurrentPassword]   = useState('')
  const [newPassword, setNewPassword]           = useState('')
  const [confirmPassword, setConfirmPassword]   = useState('')
  const [showCurrent, setShowCurrent]           = useState(false)
  const [showNew, setShowNew]                   = useState(false)
  const [showConfirm, setShowConfirm]           = useState(false)
  const [signOutOther, setSignOutOther]         = useState(true)
  const [isLoading, setIsLoading]               = useState(false)
  const [success, setSuccess]                   = useState(false)
  const [error, setError]                       = useState('')

  const strength = getPasswordStrength(newPassword)
  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword
  const canSubmit = currentPassword && newPassword.length >= 8 && passwordsMatch && !isLoading

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || !user) return

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      await user.updatePassword({
        currentPassword,
        newPassword,
        signOutOfOtherSessions: signOutOther,
      })
      setSuccess(true)
      // Navigate back after short delay so user can see the success state
      setTimeout(() => router.push('/account/security'), 1800)
    } catch (err: any) {
      // Clerk errors have a `.errors` array
      const clerkMsg = err?.errors?.[0]?.longMessage ?? err?.errors?.[0]?.message
      setError(clerkMsg ?? 'Failed to update password. Please check your current password and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100 flex flex-col items-center justify-center gap-4 px-4">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 size={32} className="text-green-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Password updated</h2>
        <p className="text-gray-600 text-center text-sm">
          Your password has been changed successfully.
          {signOutOther && ' All other sessions have been signed out.'}
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="px-4 py-4 max-w-md mx-auto flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 active:scale-95 transition-transform touch-manipulation"
          >
            <ChevronLeft size={24} className="text-gray-700" />
          </button>
          <Lock size={22} className="text-blue-600" />
          <h1 className="text-xl font-semibold text-gray-900 flex-1">Change password</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-6 max-w-md mx-auto space-y-5 pb-24">
        {/* Current password */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Current password</label>
          <div className="relative">
            <input
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 pr-12 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
            />
            <button
              type="button"
              onClick={() => setShowCurrent((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 touch-manipulation"
            >
              {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* New password */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">New password</label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 pr-12 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
            />
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 touch-manipulation"
            >
              {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {newPassword && (
            <div className="space-y-1">
              <StrengthBar score={strength.score} />
              <p className={`text-xs font-medium ${strength.color}`}>{strength.label}</p>
            </div>
          )}
          <p className="text-xs text-gray-500">Must be at least 8 characters</p>
        </div>

        {/* Confirm new password */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Confirm new password</label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 pr-12 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 touch-manipulation"
            >
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {confirmPassword && (
            <p className={`text-xs font-medium flex items-center gap-1 ${passwordsMatch ? 'text-green-600' : 'text-red-500'}`}>
              {passwordsMatch
                ? <><CheckCircle2 size={12} /> Passwords match</>
                : <><AlertCircle size={12} /> Passwords do not match</>}
            </p>
          )}
        </div>

        {/* Sign out other sessions toggle */}
        <button
          type="button"
          onClick={() => setSignOutOther((v) => !v)}
          className="w-full bg-white rounded-xl border border-gray-200 p-4 shadow-sm touch-manipulation"
        >
          <div className="flex items-center justify-between">
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900">Sign out all other sessions</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Revoke all active sessions on other devices for security
              </p>
            </div>
            {/* Toggle */}
            <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${signOutOther ? 'bg-blue-600' : 'bg-gray-200'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${signOutOther ? 'translate-x-6' : 'translate-x-1'}`} />
            </div>
          </div>
        </button>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
            <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full py-4 rounded-2xl font-semibold text-base transition-all touch-manipulation
            disabled:bg-blue-300 disabled:cursor-not-allowed
            bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white shadow-md"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Updating…
            </span>
          ) : (
            'Update password'
          )}
        </button>
      </form>
    </div>
  )
}
