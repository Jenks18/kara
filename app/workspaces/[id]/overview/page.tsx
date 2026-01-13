'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Building } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Workspace {
  id: string
  name: string
  avatar: string
  currency: string
  currency_symbol: string
  description?: string
  plan_type?: string
  address?: string
}

export default function OverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [workspaceId, setWorkspaceId] = useState<string>('')
  const [showMoreMenu, setShowMoreMenu] = useState(false)

  useEffect(() => {
    params.then(p => setWorkspaceId(p.id))
  }, [params])

  useEffect(() => {
    async function fetchWorkspace() {
      if (!workspaceId) return
      
      try {
        const response = await fetch(`/api/workspaces/${workspaceId}`)
        if (response.ok) {
          const data = await response.json()
          setWorkspace(data.workspace)
        }
      } catch (error) {
        console.error('Error fetching workspace:', error)
      }
      setLoading(false)
    }

    fetchWorkspace()
  }, [workspaceId])

  const handleInvite = () => {
    alert('Invite functionality coming soon')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121f16] flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  if (!workspace) {
    return (
      <div className="min-h-screen bg-[#121f16] flex items-center justify-center">
        <div className="text-gray-400">Workspace not found</div>
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
          <Building size={24} className="text-primary" />
          <h1 className="text-xl font-bold text-white flex-1">Overview</h1>
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
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Invite
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

        {/* Workspace Avatar */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
              <span className="text-4xl font-bold text-white">{workspace.avatar}</span>
            </div>
            <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-dark-200 border border-gray-800 flex items-center justify-center active:scale-95 transition-transform">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="space-y-4">
          {/* Workspace name */}
          <button className="w-full bg-dark-200 rounded-xl border border-gray-800 p-4 active:bg-dark-100 transition-colors">
            <div className="text-left space-y-1">
              <div className="text-xs text-gray-400">Workspace name</div>
              <div className="text-white font-semibold">{workspace.name}</div>
            </div>
            <ChevronRight size={20} className="text-gray-400 absolute right-6 top-1/2 -translate-y-1/2" />
          </button>

          {/* Description */}
          <button className="w-full bg-dark-200 rounded-xl border border-gray-800 p-4 active:bg-dark-100 transition-colors relative">
            <div className="text-left space-y-1">
              <div className="text-xs text-gray-400">Description</div>
              <div className="text-white">
                {workspace.description || 'One place for all your receipts and expenses.'}
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-400 absolute right-6 top-1/2 -translate-y-1/2" />
          </button>

          {/* Default currency */}
          <button className="w-full bg-dark-200 rounded-xl border border-gray-800 p-4 active:bg-dark-100 transition-colors relative">
            <div className="text-left space-y-1">
              <div className="text-xs text-gray-400">Default currency</div>
              <div className="text-white font-semibold">{workspace.currency} - {workspace.currency_symbol}</div>
              <div className="text-xs text-gray-400 mt-2">
                All expenses on this workspace will be converted to this currency.
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-400 absolute right-6 top-6" />
          </button>

          {/* Company address */}
          <button className="w-full bg-dark-200 rounded-xl border border-gray-800 p-4 active:bg-dark-100 transition-colors relative">
            <div className="text-left space-y-1">
              <div className="text-xs text-gray-400">Company address</div>
              <div className="text-white">{workspace.address || ''}</div>
            </div>
            <ChevronRight size={20} className="text-gray-400 absolute right-6 top-1/2 -translate-y-1/2" />
          </button>

          {/* Plan type */}
          <button className="w-full bg-dark-200 rounded-xl border border-gray-800 p-4 active:bg-dark-100 transition-colors relative">
            <div className="text-left space-y-1">
              <div className="text-xs text-gray-400">Plan type</div>
              <div className="text-white font-semibold">{workspace.plan_type || 'Collect'}</div>
            </div>
            <ChevronRight size={20} className="text-gray-400 absolute right-6 top-1/2 -translate-y-1/2" />
          </button>
        </div>
      </div>
    </div>
  )
}
