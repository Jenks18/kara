'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import BottomNav from '@/components/navigation/BottomNav'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import { Briefcase, Search, Shield } from 'lucide-react'

// Force dynamic rendering to avoid Clerk prerender issues
export const dynamic = 'force-dynamic'

interface Workspace {
  id: string
  name: string
  avatar: string
  currency: string
  currency_symbol: string
}

export default function WorkspacesPage() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  useEffect(() => {
    async function fetchWorkspaces() {
      if (!isLoaded) return
      
      setLoading(true)
      try {
        const response = await fetch('/api/workspaces')
        if (response.ok) {
          const data = await response.json()
          setWorkspaces(data.workspaces || [])
        } else {
          console.error('Failed to fetch workspaces')
        }
      } catch (error) {
        console.error('Error fetching workspaces:', error)
      }
      setLoading(false)
    }

    if (isLoaded || !user) {
      fetchWorkspaces()
    }
  }, [user?.id, isLoaded])

  const handleNewWorkspace = () => {
    router.push('/workspaces/new')
  }

  const handleDeleteWorkspace = async (workspaceId: string) => {
    if (!confirm('Are you sure you want to delete this workspace?')) return
    
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setWorkspaces(workspaces.filter(w => w.id !== workspaceId))
        setActiveMenu(null)
      } else {
        alert('Failed to delete workspace')
      }
    } catch (error) {
      console.error('Error deleting workspace:', error)
      alert('Failed to delete workspace')
    }
  }

  const handleGoToWorkspace = (workspaceId: string) => {
    // TODO: Navigate to workspace detail view
    router.push(`/workspaces/${workspaceId}`)
    setActiveMenu(null)
  }

  const handleDuplicateWorkspace = async (workspace: Workspace) => {
    try {
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${workspace.name} (Copy)`,
          avatar: workspace.avatar,
          currency: workspace.currency,
          currencySymbol: workspace.currency_symbol,
        })
      })

      if (response.ok) {
        const data = await response.json()
        setWorkspaces([...workspaces, data.workspace])
        setActiveMenu(null)
      } else {
        alert('Failed to duplicate workspace')
      }
    } catch (error) {
      console.error('Error duplicating workspace:', error)
      alert('Failed to duplicate workspace')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100 pb-20" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-emerald-200">
        <div className="px-4 py-6 max-w-md mx-auto flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Workspaces</h1>
          <button className="p-2 active:scale-95 transition-transform">
            <Search size={24} className="text-gray-600" />
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="px-4 py-8 max-w-md mx-auto">
        {workspaces.length === 0 ? (
          // Empty State with illustration
          <div className="flex flex-col items-center text-center">
            {/* Illustration */}
            <div className="w-full max-w-sm mb-8 rounded-3xl overflow-hidden bg-gradient-to-br from-purple-900/40 to-purple-800/40 p-12">
              <div className="relative w-full aspect-video flex items-center justify-center">
                {/* Planet with ring */}
                <div className="relative">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 relative">
                    {/* Ring around planet */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-48 h-24 border-8 border-purple-400 rounded-full transform rotate-12 opacity-80"></div>
                    </div>
                    {/* Small decorative elements */}
                    <div className="absolute top-4 right-4 w-3 h-3 bg-white rounded-full animate-pulse"></div>
                    <div className="absolute bottom-8 left-8 w-2 h-2 bg-white rounded-full animate-pulse delay-100"></div>
                    <div className="absolute top-1/2 right-12 w-2 h-2 bg-white rounded-full animate-pulse delay-200"></div>
                  </div>
                  {/* Money/receipt icons on the ring */}
                  <div className="absolute top-8 left-0 w-8 h-8 bg-yellow-400 rounded-lg transform -rotate-12 flex items-center justify-center text-lg">
                    💰
                  </div>
                  <div className="absolute top-12 right-4 w-8 h-8 bg-cyan-400 rounded-lg transform rotate-12 flex items-center justify-center text-lg">
                    🧾
                  </div>
                </div>
              </div>
            </div>

            {/* Text */}
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              You have no workspaces
            </h2>
            <p className="text-gray-600 mb-8 max-w-sm">
              Track receipts, reimburse expenses, manage travel, send invoices, and more.
            </p>

            {/* New Workspace Button */}
            <button
              onClick={handleNewWorkspace}
              className="
                w-full max-w-md py-4 rounded-2xl
                bg-gradient-to-r from-emerald-500 to-emerald-600
                text-white font-semibold text-lg
                active:scale-[0.98] transition-transform
                shadow-lg shadow-emerald-500/20
              "
            >
              New workspace
            </button>
          </div>
        ) : (
          // Workspaces List (when we have workspaces)
          <div className="space-y-4">
            {workspaces.map((workspace) => (
              <div key={workspace.id} className="relative">
                <button
                  onClick={() => handleGoToWorkspace(workspace.id)}
                  className="
                    w-full p-4 bg-white rounded-xl border border-gray-200 hover:border-emerald-300
                    active:bg-gray-50 transition-colors shadow-sm
                    flex items-center gap-4
                  "
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl font-bold text-white">{workspace.avatar}</span>
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-gray-900 font-semibold">{workspace.name}</h3>
                    <p className="text-sm text-gray-600">{workspace.currency} - {workspace.currency_symbol}</p>
                  </div>
                </button>
                
                {/* Three-dot menu button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveMenu(activeMenu === workspace.id ? null : workspace.id)
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 active:scale-95 transition-transform"
                >
                  <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="5" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="12" cy="19" r="2" />
                  </svg>
                </button>

                {/* Dropdown menu */}
                {activeMenu === workspace.id && (
                  <>
                    {/* Backdrop to close menu */}
                    <div 
                      className="fixed inset-0 z-40"
                      onClick={() => setActiveMenu(null)}
                    />
                    
                    {/* Menu panel */}
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden">
                      <button
                        onClick={() => handleGoToWorkspace(workspace.id)}
                        className="w-full px-4 py-4 flex items-center gap-3 text-left text-gray-900 hover:bg-gray-50 transition-colors"
                      >
                        <Briefcase size={20} className="text-gray-600" />
                        <span className="font-medium">Go to workspace</span>
                      </button>
                      
                      <button
                        onClick={() => handleDuplicateWorkspace(workspace)}
                        className="w-full px-4 py-4 flex items-center gap-3 text-left text-gray-900 hover:bg-gray-50 transition-colors border-t border-gray-200"
                      >
                        <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span className="font-medium">Duplicate Workspace</span>
                      </button>
                      
                      <button
                        onClick={() => handleDeleteWorkspace(workspace.id)}
                        className="w-full px-4 py-4 flex items-center gap-3 text-left text-red-600 hover:bg-red-50 transition-colors border-t border-gray-200"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span className="font-medium">Delete workspace</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            
            {/* Add New Workspace Button */}
            <button
              onClick={handleNewWorkspace}
              className="
                w-full py-4 rounded-xl
                bg-gradient-to-r from-emerald-500 to-green-600
                text-white font-semibold
                active:scale-[0.98] transition-transform shadow-md
                flex items-center justify-center gap-2
              "
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add workspace
            </button>
          </div>
        )}
        
        {/* Domains Section */}
        <div className="mt-12">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Domains
          </h3>
          
          <div className="bg-white rounded-2xl border border-gray-200 p-6 flex items-start gap-4 shadow-sm">
            <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Shield size={28} className="text-emerald-600" />
            </div>
            
            <div className="flex-1">
              <h4 className="text-gray-900 font-semibold mb-2">Enhanced security</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Require members on your domain to log in via single sign-on, restrict workspace creation, and more.
              </p>
            </div>
            
            <button className="
              px-6 py-2 rounded-full
              bg-gradient-to-r from-emerald-500 to-emerald-600
              text-white font-medium text-sm
              active:scale-95 transition-transform
              whitespace-nowrap
              flex-shrink-0
            ">
              Enable
            </button>
          </div>
        </div>
      </div>
      
      <BottomNav />
    </div>
  )
}
