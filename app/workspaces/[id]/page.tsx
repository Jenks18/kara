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
        const response = await fetch(`/api/workspaces/${workspaceId}`, {
          cache: 'no-store' // Always fetch fresh data
        })
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

    // Refetch when page becomes visible (user navigates back)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && workspaceId) {
        fetchWorkspace()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [workspaceId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!workspace) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-gray-600">Workspace not found</div>
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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100 pb-20" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-emerald-200">
        <div className="px-4 py-4 max-w-md mx-auto flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 active:scale-95 transition-transform"
          >
            <ChevronLeft size={24} className="text-gray-700" />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {workspace.avatar?.startsWith('http') ? (
                <img 
                  src={workspace.avatar} 
                  alt={workspace.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xl font-bold text-white">{workspace.avatar || workspace.name?.charAt(0) || 'W'}</span>
              )}
            </div>
            <h1 className="text-xl font-bold text-gray-900">{workspace.name}</h1>
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
                  w-full px-4 py-4 bg-white rounded-xl border border-emerald-200
                  active:bg-emerald-50 transition-colors shadow-sm
                  flex items-center gap-4
                "
              >
                <Icon size={24} className="text-emerald-600" />
                <span className="text-gray-900 font-medium text-lg">{item.label}</span>
              </button>
            )
          })}
        </div>

        {/* Submit expenses section */}
        <div className="pt-4">
          <h2 className="text-gray-600 text-sm mb-3">Submit your expenses below:</h2>
          
          <button
            onClick={() => router.push(`/workspaces/${workspaceId}/expenses`)}
            className="
              w-full p-4 bg-white rounded-xl border border-emerald-200
              active:bg-emerald-50 transition-colors shadow-sm
              flex items-center gap-4
            "
          >
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-bold text-white">{workspace.avatar}</span>
              </div>
              {user && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-yellow-500 border-2 border-white flex items-center justify-center">
                  <span className="text-xs">👤</span>
                </div>
              )}
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-gray-900 font-semibold">{user?.emailAddresses[0]?.emailAddress?.split('@')[0] || 'My'} expenses</h3>
              <p className="text-sm text-gray-600">Workspace</p>
            </div>
            <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
