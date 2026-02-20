'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { ChevronLeft, UserPlus, Users, Share2, Trash2, X, Download } from 'lucide-react'
import QRCode from 'react-qr-code'
import { getUserProfile } from '@/lib/api/user-profiles'
import { useToast } from '@/components/ui/Toast'

export const dynamic = 'force-dynamic'

interface WorkspaceMember {
  id: string
  user_id: string
  workspace_id: string
  email: string
  role: 'admin' | 'member'
  display_name?: string
  first_name?: string
  last_name?: string
  avatar_emoji?: string
  avatar_color?: string
  avatar_image_url?: string
  joined_at: string
}

interface Workspace {
  id: string
  name: string
}

export default function MembersPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { user } = useUser()
  const { showToast } = useToast()
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [workspaceId, setWorkspaceId] = useState<string>('')
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [inviteInput, setInviteInput] = useState('')
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [shareUrl, setShareUrl] = useState('')

  useEffect(() => {
    params.then(p => setWorkspaceId(p.id))
  }, [params])

  // Compute share URL client-side to avoid hydration mismatch
  useEffect(() => {
    if (workspaceId) {
      setShareUrl(`${window.location.origin}/workspaces/${workspaceId}/join`)
    }
  }, [workspaceId])

  useEffect(() => {
    async function fetchData() {
      if (!workspaceId || !user) return
      
      try {
        // Fetch workspace info
        const wsResponse = await fetch(`/api/workspaces/${workspaceId}`)
        if (wsResponse.ok) {
          const wsData = await wsResponse.json()
          setWorkspace(wsData.workspace)
        }

        // Fetch workspace members from API
        const response = await fetch(`/api/workspaces/${workspaceId}/members`)
        if (response.ok) {
          const data = await response.json()
          setMembers(data.members || [])
        } else if (response.status === 404) {
          // If endpoint doesn't exist, initialize with current user
          const profile = await getUserProfile(user.id)
          setMembers([
            {
              id: `${workspaceId}-${user.id}`,
              user_id: user.id,
              workspace_id: workspaceId,
              email: user.emailAddresses[0]?.emailAddress || '',
              role: 'admin',
              display_name: profile?.display_name || undefined,
              first_name: profile?.first_name || undefined,
              last_name: profile?.last_name || undefined,
              avatar_emoji: profile?.avatar_emoji || '💼',
              avatar_color: profile?.avatar_color || 'from-blue-500 to-blue-600',
              avatar_image_url: profile?.avatar_image_url || undefined,
              joined_at: new Date().toISOString()
            }
          ])
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        // Fallback to current user
        const profile = await getUserProfile(user.id)
        setMembers([
          {
            id: `${workspaceId}-${user.id}`,
            user_id: user.id,
            workspace_id: workspaceId,
            email: user.emailAddresses[0]?.emailAddress || '',
            role: 'admin',
            display_name: profile?.display_name || undefined,
            first_name: profile?.first_name || undefined,
            last_name: profile?.last_name || undefined,
            avatar_emoji: profile?.avatar_emoji || '💼',
            avatar_color: profile?.avatar_color || 'from-blue-500 to-blue-600',
            avatar_image_url: profile?.avatar_image_url || undefined,
            joined_at: new Date().toISOString()
          }
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, workspaceId])

  const handleInvite = () => {
    setShowInviteModal(true)
    setShowMoreMenu(false)
  }

  const handleShare = () => {
    setShowShareModal(true)
    setShowMoreMenu(false)
  }

  const handleDelete = () => {
    setShowDeleteModal(true)
    setShowMoreMenu(false)
  }

  const handleConfirmDelete = async () => {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        router.push('/workspaces')
      } else {
        showToast('Failed to delete workspace', 'error')
      }
    } catch (error) {
      console.error('Error deleting workspace:', error)
      showToast('Failed to delete workspace', 'error')
    }
  }

  const downloadQRCode = () => {
    const svg = document.getElementById('members-qr-code')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      canvas.width = 800
      canvas.height = 800
      ctx?.drawImage(img, 0, 0, 800, 800)
      
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `${workspace?.name || 'workspace'}-qr-code.png`
          link.click()
          URL.revokeObjectURL(url)
        }
      })
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-blue-200">
        <div className="px-4 py-4 max-w-md mx-auto flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 active:scale-95 transition-transform"
          >
            <ChevronLeft size={24} className="text-gray-700" />
          </button>
          <Users size={24} className="text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900 flex-1">Members</h1>
        </div>
      </div>
      
      {/* Content */}
      <div className="px-4 py-6 max-w-md mx-auto space-y-6">
        {/* Top Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleInvite}
            className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <UserPlus size={20} />
            Invite
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="px-6 py-3 rounded-xl bg-white border border-blue-200 text-gray-600 font-semibold active:scale-[0.98] transition-transform flex items-center gap-2 shadow-sm"
            >
              More
              <svg className={`w-4 h-4 transition-transform ${showMoreMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* More Menu Dropdown */}
            {showMoreMenu && (
              <>
                <div 
                  className="fixed inset-0 z-30" 
                  onClick={() => setShowMoreMenu(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl border border-blue-200 shadow-lg overflow-hidden z-40">
                  <button
                    onClick={handleShare}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-blue-50 transition-colors text-left"
                  >
                    <Share2 size={20} className="text-blue-600" />
                    <span className="text-gray-900 font-medium">Share</span>
                  </button>
                  <button
                    onClick={handleDelete}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-50 transition-colors text-left border-t border-gray-100"
                  >
                    <Trash2 size={20} className="text-red-600" />
                    <span className="text-red-600 font-medium">Delete</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Total members count - live count */}
        <div className="text-gray-600 text-sm">
          Total workspace members: {members.length}
        </div>

        {/* Members table header */}
        <div className="grid grid-cols-2 gap-4 text-xs text-gray-500 px-4">
          <div>Member</div>
          <div className="text-right">Role</div>
        </div>

        {/* Members List */}
        <div className="space-y-2">
          {members.map((member) => {
            // Priority: first_name + last_name > display_name > email
            const fullName = member.first_name && member.last_name 
              ? `${member.first_name} ${member.last_name}`.trim()
              : null
            const displayText = fullName || member.display_name || member.email
            const secondaryText = fullName || member.display_name ? member.email : ''
            
            return (
              <button
                key={member.id}
                className="w-full bg-white rounded-xl border border-blue-200 p-4 active:bg-blue-50 transition-colors shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${member.avatar_color || 'from-blue-500 to-blue-600'} flex items-center justify-center overflow-hidden flex-shrink-0`}>
                      {member.avatar_image_url ? (
                        <img 
                          src={member.avatar_image_url} 
                          alt={displayText} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <span className="text-white font-bold text-lg">
                          {member.avatar_emoji || member.email.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="text-left">
                      <div className="text-gray-900 font-semibold">{displayText}</div>
                      {secondaryText && <div className="text-sm text-gray-600">{secondaryText}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-4 py-1.5 rounded-full text-sm font-medium ${
                      member.role === 'admin' 
                        ? 'bg-blue-100 border border-blue-200 text-blue-700' 
                        : 'bg-gray-100 border border-gray-200 text-gray-700'
                    }`}>
                      {member.role === 'admin' ? 'Admin' : 'Member'}
                    </span>
                    <ChevronLeft size={20} className="text-gray-600 rotate-180" />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Invite via SMS</h2>
              <button onClick={() => { setShowInviteModal(false); setInviteLink(''); setInviteInput('') }} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} className="text-gray-600" />
              </button>
            </div>
            <p className="text-sm text-gray-600">Enter a phone number — we&apos;ll open your messaging app with the invite link.</p>

            {!inviteLink ? (
              <>
                <input
                  type="tel"
                  value={inviteInput}
                  onChange={(e) => setInviteInput(e.target.value)}
                  placeholder="+254 712 345 678"
                  className="w-full px-4 py-3 border-2 border-blue-500 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-600"
                />
                <button
                  disabled={inviteSending || !inviteInput.trim()}
                  onClick={async () => {
                    setInviteSending(true)
                    try {
                      const res = await fetch(`/api/workspaces/${workspaceId}/invites`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ contact: inviteInput.trim() }),
                      })
                      const data = await res.json()
                      if (!res.ok) { showToast(data.error || 'Failed to create invite', 'error'); return }
                      const url = data.inviteUrl as string
                      setInviteLink(url)
                      const smsBody = encodeURIComponent(`Join my workspace "${data.workspaceName || 'Kacha'}" on Kacha:\n${url}`)
                      const phone = inviteInput.trim().replace(/\s+/g, '')
                      window.open(`sms:${phone}?&body=${smsBody}`, '_self')
                      showToast('SMS composer opened', 'success')
                    } catch {
                      showToast('Something went wrong', 'error')
                    } finally {
                      setInviteSending(false)
                    }
                  }}
                  className="w-full py-4 bg-[#0066FF] disabled:opacity-50 text-white font-semibold rounded-2xl active:scale-[0.98] transition-all"
                >
                  {inviteSending ? 'Creating invite...' : 'Send via SMS'}
                </button>
              </>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">If the messaging app didn&apos;t open, copy the link below and send it manually:</p>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                  <input readOnly value={inviteLink} className="flex-1 bg-transparent text-sm text-gray-700 outline-none truncate" />
                  <button
                    onClick={() => { navigator.clipboard.writeText(inviteLink); showToast('Link copied!', 'success') }}
                    className="px-3 py-1.5 bg-[#0066FF] text-white text-xs font-semibold rounded-lg flex-shrink-0"
                  >Copy</button>
                </div>
                <button
                  onClick={() => { setInviteLink(''); setInviteInput(''); setShowInviteModal(false) }}
                  className="w-full py-3 border border-gray-200 text-gray-700 font-medium rounded-2xl active:scale-[0.98] transition-all"
                >Done</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Share workspace</h2>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>
            
            {/* Real QR Code */}
            <div className="flex justify-center py-8">
              <div className="p-4 bg-white border-4 border-blue-600 rounded-2xl">
                <QRCode
                  id="members-qr-code"
                  value={shareUrl}
                  size={200}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  viewBox={`0 0 200 200`}
                  fgColor="#0066FF"
                  bgColor="#ffffff"
                />
              </div>
            </div>

            {/* Share URL */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-xs text-gray-600 mb-2">Share link</p>
              <p className="text-sm text-gray-900 font-mono break-all">{shareUrl}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl)
                  showToast('Link copied to clipboard!', 'success')
                }}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Share2 size={18} />
                Copy Link
              </button>
              <button
                onClick={downloadQRCode}
                className="flex-1 py-3 bg-white border-2 border-blue-600 text-blue-600 font-semibold rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Download size={18} />
                Download QR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 space-y-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 size={32} className="text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Delete workspace?</h2>
              <p className="text-gray-600">
                Are you sure you want to delete "{workspace?.name}"? This action cannot be undone and all data will be permanently lost.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-xl active:scale-[0.98] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl active:scale-[0.98] transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close more menu */}
      {showMoreMenu && (
        <div 
          className="fixed inset-0 z-30" 
          onClick={() => setShowMoreMenu(false)}
        />
      )}
    </div>
  )
}

