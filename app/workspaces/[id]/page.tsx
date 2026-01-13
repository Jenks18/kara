'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { ChevronLeft, FileText, Users, Folder, GitBranch, CreditCard, Settings, Receipt } from 'lucide-react'

// Force dynamic rendering to avoid Clerk prerender issues
export const dynamic = 'force-dynamic'

interface Workspace {
  id: string
  name: string
  avatar: string
  currency: string
  currency_symbol: string
}

export default function WorkspaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { user } = useUser()
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [workspaceId, setWorkspaceId] = useState<string>('')

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
        } else {
          console.error('Failed to fetch workspace')
        }
      } catch (error) {
        console.error('Error fetching workspace:', error)
      }
      setLoading(false)
    }

    fetchWorkspace()
  }, [workspaceId])

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-300 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  if (!workspace) {
    return (
      <div className="min-h-screen bg-dark-300 flex items-center justify-center">
        <div className="text-gray-400">Workspace not found</div>
      </div>
    )
  }

  const menuItems = [
    { icon: Receipt, label: 'Overview', href: `/workspaces/${workspaceId}/overview` },
    { icon: Users, label: 'Members', href: `/workspaces/${workspaceId}/members` },
    { icon: FileText, label: 'Reports', href: `/workspaces/${workspaceId}/reports` },
    { icon: Folder, label: 'Categories', href: `/workspaces/${workspaceId}/categories` },
    { icon: GitBranch, label: 'Workflows', href: `/workspaces/${workspaceId}/workflows` },
    { icon: CreditCard, label: 'Company cards', href: `/workspaces/${workspaceId}/cards` },
    { icon: Settings, label: 'More features', href: `/workspaces/${workspaceId}/features` },
  ]

  return (
    <div className="min-h-screen bg-dark-300 pb-20" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-dark-300 border-b border-gray-800">
        <div className="px-4 py-4 max-w-md mx-auto flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 active:scale-95 transition-transform"
          >
            <ChevronLeft size={24} className="text-gray-400" />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-bold text-white">{workspace.avatar}</span>
            </div>
            <h1 className="text-xl font-bold text-white">{workspace.name}</h1>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="px-4 py-6 max-w-md mx-auto space-y-6">
        {/* Menu Items */}
        <div className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.label}
                onClick={() => router.push(item.href)}
                className="
                  w-full px-4 py-4 bg-dark-200 rounded-xl border border-gray-800
                  active:bg-dark-100 transition-colors
                  flex items-center gap-4
                "
              >
                <Icon size={24} className="text-gray-400" />
                <span className="text-white font-medium text-lg">{item.label}</span>
              </button>
            )
          })}
        </div>

        {/* Submit expenses section */}
        <div className="pt-4">
          <h2 className="text-gray-400 text-sm mb-3">Submit your expenses below:</h2>
          
          <button
            onClick={() => router.push(`/workspaces/${workspaceId}/expenses`)}
            className="
              w-full p-4 bg-dark-200 rounded-xl border border-gray-800
              active:bg-dark-100 transition-colors
              flex items-center gap-4
            "
          >
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-bold text-white">{workspace.avatar}</span>
              </div>
              {user && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-yellow-500 border-2 border-dark-200 flex items-center justify-center">
                  <span className="text-xs">👤</span>
                </div>
              )}
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-white font-semibold">{user?.emailAddresses[0]?.emailAddress?.split('@')[0] || 'My'} expenses</h3>
              <p className="text-sm text-gray-400">Workspace</p>
            </div>
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
