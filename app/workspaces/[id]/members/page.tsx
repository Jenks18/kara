'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { ChevronLeft, UserPlus, Users } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface WorkspaceMember {
  id: string
  email: string
  role: string
  avatar?: string
}

export default function MembersPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { user } = useUser()
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [loading, setLoading] = useState(true)
  const [workspaceId, setWorkspaceId] = useState<string>('')
  const [showMoreMenu, setShowMoreMenu] = useState(false)

  useEffect(() => {
    params.then(p => setWorkspaceId(p.id))
  }, [params])

  useEffect(() => {
    // Initialize with current user as owner
    if (user && workspaceId) {
      setMembers([
        {
          id: user.id,
          email: user.emailAddresses[0]?.emailAddress || '',
          role: 'Owner',
          avatar: user.imageUrl
        }
      ])
      setLoading(false)
    }
  }, [user, workspaceId])

  const handleInvite = () => {
    alert('Invite member functionality coming soon')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121f16] flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#121f16]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#121f16] border-b border-gray-800">
        <div className="px-4 py-4 max-w-md mx-auto flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 active:scale-95 transition-transform"
          >
            <ChevronLeft size={24} className="text-gray-400" />
          </button>
          <Users size={24} className="text-primary" />
          <h1 className="text-xl font-bold text-white flex-1">Members</h1>
        </div>
      </div>
      
      {/* Content */}
      <div className="px-4 py-6 max-w-md mx-auto space-y-6">
        {/* Top Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleInvite}
            className="flex-1 py-3 rounded-xl bg-primary text-white font-semibold active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <UserPlus size={20} />
            Invite member
          </button>
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className="px-6 py-3 rounded-xl bg-dark-200 border border-gray-800 text-gray-400 font-semibold active:scale-[0.98] transition-transform flex items-center gap-2"
          >
            More
            <svg className={`w-4 h-4 transition-transform ${showMoreMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Total members count */}
        <div className="text-gray-400 text-sm">
          Total workspace members: {members.length}
        </div>

        {/* Members table header */}
        <div className="grid grid-cols-2 gap-4 text-xs text-gray-400 px-4">
          <div>Member</div>
          <div className="text-right">Role</div>
        </div>

        {/* Members List */}
        <div className="space-y-2">
          {members.map((member) => (
            <button
              key={member.id}
              className="w-full bg-dark-200 rounded-xl border border-gray-800 p-4 active:bg-dark-100 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center overflow-hidden">
                    {member.avatar ? (
                      <img src={member.avatar} alt={member.email} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-bold text-lg">
                        {member.email.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="text-left">
                    <div className="text-white font-semibold">{member.email}</div>
                    <div className="text-sm text-gray-400">{member.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-4 py-1.5 rounded-full bg-dark-300 border border-gray-700 text-white text-sm font-medium">
                    {member.role}
                  </span>
                  <ChevronLeft size={20} className="text-gray-400 rotate-180" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
