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

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-300 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-300 pb-20" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-dark-300 border-b border-gray-800">
        <div className="px-4 py-6 max-w-md mx-auto flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Workspaces</h1>
          <button className="p-2 active:scale-95 transition-transform">
            <Search size={24} className="text-gray-400" />
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
            <h2 className="text-2xl font-bold text-white mb-3">
              You have no workspaces
            </h2>
            <p className="text-gray-400 mb-8 max-w-sm">
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
              <button
                key={workspace.id}
                onClick={() => {/* TODO: Navigate to workspace */}}
                className="
                  w-full p-4 bg-dark-200 rounded-xl border border-gray-800
                  active:bg-dark-100 transition-colors
                  flex items-center gap-4
                "
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl font-bold text-white">{workspace.avatar}</span>
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-white font-semibold">{workspace.name}</h3>
                  <p className="text-sm text-gray-400">{workspace.currency} - {workspace.currency_symbol}</p>
                </div>
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
            
            {/* Add New Workspace Button */}
            <button
              onClick={handleNewWorkspace}
              className="
                w-full py-4 rounded-xl
                border-2 border-dashed border-gray-700
                text-gray-400 font-medium
                active:bg-dark-100 transition-colors
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
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Domains
          </h3>
          
          <div className="bg-dark-200 rounded-2xl border border-gray-800 p-6 flex items-start gap-4">
            <div className="w-14 h-14 bg-cyan-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Shield size={28} className="text-cyan-400" />
            </div>
            
            <div className="flex-1">
              <h4 className="text-white font-semibold mb-2">Enhanced security</h4>
              <p className="text-sm text-gray-400 leading-relaxed">
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
