'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { CheckCircle, XCircle, Users, Loader2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface InviteDetails {
  id: string
  workspaceId: string
  workspaceName: string
  workspaceAvatar?: string
  memberCount: number
  email: string
  role: string
  message?: string
  inviterName: string
  createdAt: string
  expiresAt: string
}

export default function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const [token, setToken] = useState('')
  const [invite, setInvite] = useState<InviteDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    params.then(p => setToken(p.token))
  }, [params])

  useEffect(() => {
    if (!token) return
    
    async function fetchInvite() {
      try {
        const res = await fetch(`/api/invites/accept/${token}`)
        const data = await res.json()
        
        if (!res.ok) {
          setError(data.error || 'Invalid invite link')
          return
        }
        
        setInvite(data.invite)
      } catch (err) {
        setError('Failed to load invite details')
      } finally {
        setLoading(false)
      }
    }

    fetchInvite()
  }, [token])

  const handleAccept = async () => {
    if (!user) {
      // Redirect to sign-in, then come back
      router.push(`/sign-in?redirect_url=/invites/accept/${token}`)
      return
    }

    setAccepting(true)
    try {
      const res = await fetch(`/api/invites/accept/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        setError(data.error || 'Failed to accept invite')
        return
      }
      
      setSuccess(true)
      // Navigate to workspace after a short delay
      setTimeout(() => {
        router.push(`/workspaces/${invite?.workspaceId}`)
      }, 2000)
    } catch (err) {
      setError('Failed to accept invite')
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <XCircle size={32} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Invalid Invite</h2>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl active:scale-[0.98] transition-transform"
          >
            Go Home
          </button>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle size={32} className="text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">You&apos;re In!</h2>
          <p className="text-gray-600">Welcome to {invite?.workspaceName}. Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full space-y-6 shadow-xl">
        {/* Workspace Avatar */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
            {invite?.workspaceAvatar?.startsWith('http') ? (
              <img src={invite.workspaceAvatar} alt="" className="w-full h-full object-cover rounded-2xl" />
            ) : (
              <span className="text-3xl font-bold text-white">
                {invite?.workspaceAvatar || invite?.workspaceName?.charAt(0) || 'W'}
              </span>
            )}
          </div>
        </div>

        {/* Invite Info */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">{invite?.workspaceName}</h2>
          <p className="text-gray-600">
            <span className="font-medium">{invite?.inviterName}</span> invited you to join as{' '}
            <span className="font-medium capitalize">{invite?.role}</span>
          </p>
          {invite?.message && (
            <p className="text-sm text-gray-500 italic">&ldquo;{invite.message}&rdquo;</p>
          )}
        </div>

        {/* Member count */}
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <Users size={16} />
          <span>{invite?.memberCount || 1} member{(invite?.memberCount || 1) !== 1 ? 's' : ''}</span>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {isLoaded && !user ? (
            <>
              <button
                onClick={() => router.push(`/sign-in?redirect_url=/invites/accept/${token}`)}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-2xl active:scale-[0.98] transition-all"
              >
                Sign in to accept
              </button>
              <button
                onClick={() => router.push(`/sign-up?redirect_url=/invites/accept/${token}`)}
                className="w-full py-4 bg-white border-2 border-blue-600 text-blue-600 font-semibold rounded-2xl active:scale-[0.98] transition-all"
              >
                Create account
              </button>
            </>
          ) : (
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-2xl active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {accepting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Joining...
                </>
              ) : (
                'Accept Invite'
              )}
            </button>
          )}
          
          <button
            onClick={() => router.push('/')}
            className="w-full py-3 text-gray-500 font-medium hover:text-gray-700 transition-colors"
          >
            Decline
          </button>
        </div>

        {/* Expiry info */}
        <p className="text-xs text-center text-gray-400">
          This invite expires {new Date(invite?.expiresAt || '').toLocaleDateString()}
        </p>
      </div>
    </div>
  )
}
