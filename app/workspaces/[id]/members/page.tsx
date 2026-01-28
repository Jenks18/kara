'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { ChevronLeft, UserPlus, Users, Share2, Trash2, X } from 'lucide-react'
import { getUserProfile } from '@/lib/api/user-profiles'

export const dynamic = 'force-dynamic'

interface WorkspaceMember {
  id: string
  user_id: string
  workspace_id: string
  email: string
  role: 'admin' | 'member'
  display_name?: string
  avatar_emoji?: string
  avatar_color?: string
  avatar_image_url?: string
  joined_at: string
}

export default function MembersPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { user } = useUser()
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [loading, setLoading] = useState(true)
  const [workspaceId, setWorkspaceId] = useState<string>('')
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteInput, setInviteInput] = useState('')

  useEffect(() => {
    params.then(p => setWorkspaceId(p.id))
  }, [params])

  useEffect(() => {
    async function fetchMembers() {
      if (!workspaceId || !user) return
      
      try {
        // Fetch workspace members from API
        const response = await fetch(`/api/workspaces/${workspaceId}/members`)
        if (response.ok) {
          const data = await response.json()
          setMembers(data.members || [])
        } else {
          // If no members endpoint yet, initialize with current user
          const profile = await getUserProfile(user.id)
          setMembers([
            {
              id: `${workspaceId}-${user.id}`,
              user_id: user.id,
              workspace_id: workspaceId,
              email: user.emailAddresses[0]?.emailAddress || '',
              role: 'admin',
              display_name: profile?.display_name || undefined,
              avatar_emoji: profile?.avatar_emoji || '💼',
              avatar_color: profile?.avatar_color || 'from-emerald-500 to-emerald-600',
              avatar_image_url: profile?.avatar_image_url || undefined,
              joined_at: new Date().toISOString()
            }
          ])
        }
      } catch (error) {
        console.error('Error fetching members:', error)
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
            avatar_emoji: profile?.avatar_emoji || '💼',
            avatar_color: profile?.avatar_color || 'from-emerald-500 to-emerald-600',
            avatar_image_url: profile?.avatar_image_url || undefined,
            joined_at: new Date().toISOString()
          }
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchMembers()
  }, [user, workspaceId])

  const handleInvite = () => {
    setShowInviteModal(true)
    setShowMoreMenu(false)
  }

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/workspaces/${workspaceId}/join`
    navigator.clipboard.writeText(shareUrl)
    alert('Workspace invite link copied to clipboard!')
    setShowMoreMenu(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-emerald-200">
        <div className="px-4 py-4 max-w-md mx-auto flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 active:scale-95 transition-transform"
          >
            <ChevronLeft size={24} className="text-gray-700" />
          </button>
          <Users size={24} className="text-emerald-600" />
          <h1 className="text-xl font-bold text-gray-900 flex-1">Members</h1>
        </div>
      </div>
      
      {/* Content */}
      <div className="px-4 py-6 max-w-md mx-auto space-y-6">
        {/* Top Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleInvite}
            className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <UserPlus size={20} />
            Invite
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="px-6 py-3 rounded-xl bg-white border border-emerald-200 text-gray-600 font-semibold active:scale-[0.98] transition-transform flex items-center gap-2 shadow-sm"
            >
              More
              <svg className={`w-4 h-4 transition-transform ${showMoreMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* More Menu Dropdown */}
            {showMoreMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl border border-emerald-200 shadow-lg overflow-hidden z-40">
                <button
                  onClick={handleShare}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-emerald-50 transition-colors text-left"
                >
                  <Share2 size={20} className="text-emerald-600" />
                  <span className="text-gray-900 font-medium">Share</span>
                </button>
              </div>
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
            const displayText = member.display_name || member.email
            
            return (
              <button
                key={member.id}
                className="w-full bg-white rounded-xl border border-emerald-200 p-4 active:bg-emerald-50 transition-colors shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${member.avatar_color || 'from-emerald-500 to-emerald-600'} flex items-center justify-center overflow-hidden flex-shrink-0`}>
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
                      <div className="text-sm text-gray-600">{member.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-4 py-1.5 rounded-full text-sm font-medium ${
                      member.role === 'admin' 
                        ? 'bg-emerald-100 border border-emerald-200 text-emerald-700' 
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
              <h2 className="text-xl font-bold text-gray-900">Invite new members</h2>
              <button onClick={() => setShowInviteModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} className="text-gray-600" />
              </button>
            </div>
            <p className="text-sm text-gray-600">Add members to this workspace</p>
            <input
              type="text"
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              placeholder="Name, email, or phone number"
              className="w-full px-4 py-3 border-2 border-emerald-500 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:border-emerald-600"
            />
            <button
              onClick={() => {
                if (inviteInput.trim()) {
                  alert(`Invite sent to: ${inviteInput}`)
                  setInviteInput('')
                  setShowInviteModal(false)
                }
              }}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-2xl active:scale-[0.98] transition-all"
            >
              Next
            </button>
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
