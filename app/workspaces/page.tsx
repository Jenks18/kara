'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import BottomNav from '@/components/navigation/BottomNav'
import { Briefcase, Plus, MoreVertical, Trash2, Copy, ChevronRight, Users } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { getCurrencySymbol } from '@/lib/currency'

export const dynamic = 'force-dynamic'

interface Workspace {
  id: string
  name: string
  avatar: string
  currency: string
  currency_symbol: string
  member_count?: number
}

/* ── Skeleton loader ─────────────────────────────────── */
function WorkspaceSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm flex items-center gap-3 animate-pulse">
          <div className="w-14 h-14 rounded-xl bg-gray-200" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-32" />
            <div className="h-3 bg-gray-100 rounded w-20" />
          </div>
          <div className="w-5 h-5 bg-gray-100 rounded" />
        </div>
      ))}
    </div>
  )
}

/* ── Main page ───────────────────────────────────────── */
export default function WorkspacesPage() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const { showToast } = useToast()

  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Workspace | null>(null)
  const [deleting, setDeleting] = useState(false)

  /* ── Fetch workspaces ───────────────────────────────── */
  const fetchWorkspaces = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/workspaces')
      if (res.ok) {
        const data = await res.json()
        setWorkspaces(data.workspaces || [])
      }
    } catch {
      // Silent — skeleton already communicates loading
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchWorkspaces() }, [fetchWorkspaces])

  /* ── Actions ────────────────────────────────────────── */
  const handleDeleteWorkspace = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/workspaces/${deleteTarget.id}`, { method: 'DELETE' })
      if (res.ok) {
        setWorkspaces((prev) => prev.filter((w) => w.id !== deleteTarget.id))
        showToast('Workspace deleted', 'success')
      } else {
        showToast('Failed to delete workspace', 'error')
      }
    } catch {
      showToast('Failed to delete workspace', 'error')
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
      setActiveMenu(null)
    }
  }

  const handleDuplicateWorkspace = async (workspace: Workspace) => {
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${workspace.name} (Copy)`,
          avatar: workspace.avatar,
          currency: workspace.currency,
          currencySymbol: workspace.currency_symbol,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setWorkspaces((prev) => [...prev, data.workspace])
        showToast('Workspace duplicated', 'success')
      } else {
        showToast('Failed to duplicate workspace', 'error')
      }
    } catch {
      showToast('Failed to duplicate workspace', 'error')
    } finally {
      setActiveMenu(null)
    }
  }

  const goTo = (id: string) => { router.push(`/workspaces/${id}`); setActiveMenu(null) }

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-blue-50 pb-20" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-blue-100">
        <div className="px-4 py-3 max-w-md mx-auto flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Workspaces</h1>
          {workspaces.length > 0 && (
            <button
              onClick={() => router.push('/workspaces/new')}
              className="w-9 h-9 rounded-full bg-[#0066FF] flex items-center justify-center active:scale-95 transition-transform"
            >
              <Plus size={20} className="text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 max-w-md mx-auto">
        {loading ? (
          <WorkspaceSkeleton />
        ) : workspaces.length === 0 ? (
          /* ── Empty state ──────────────────────────────── */
          <div className="flex flex-col items-center text-center pt-16">
            <div className="w-20 h-20 rounded-2xl bg-blue-100 flex items-center justify-center mb-6">
              <Briefcase size={36} className="text-[#0066FF]" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No workspaces yet</h2>
            <p className="text-gray-500 mb-8 max-w-xs">
              Create a workspace to start tracking receipts, expenses, and reports with your team.
            </p>
            <button
              onClick={() => router.push('/workspaces/new')}
              className="w-full max-w-xs py-4 rounded-2xl bg-[#0066FF] text-white font-semibold text-lg active:scale-[0.98] transition-transform shadow-lg shadow-blue-500/20"
            >
              Create workspace
            </button>
          </div>
        ) : (
          /* ── Workspace cards ──────────────────────────── */
          <div className="space-y-3">
            {workspaces.map((ws) => (
              <div key={ws.id} className="relative">
                <button
                  onClick={() => goTo(ws.id)}
                  className="w-full p-4 bg-white rounded-xl border border-gray-100 active:bg-gray-50 transition-colors shadow-sm flex items-center gap-3"
                >
                  {/* Avatar */}
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#0066FF] to-blue-700 flex items-center justify-center flex-shrink-0">
                    {ws.avatar?.startsWith('http') ? (
                      <img src={ws.avatar} alt={ws.name} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <span className="text-2xl font-bold text-white">
                        {ws.avatar || ws.name?.charAt(0) || 'W'}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 text-left min-w-0">
                    <h3 className="text-gray-900 font-semibold text-base truncate">{ws.name}</h3>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-sm text-gray-500">
                        {ws.currency} ({getCurrencySymbol(ws.currency)})
                      </span>
                      {ws.member_count != null && (
                        <span className="flex items-center gap-1 text-sm text-gray-400">
                          <Users size={13} />
                          {ws.member_count}
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight size={20} className="text-gray-300 flex-shrink-0" />
                </button>

                {/* Three-dot menu */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveMenu(activeMenu === ws.id ? null : ws.id)
                  }}
                  className="absolute right-10 top-1/2 -translate-y-1/2 p-2 active:scale-95 transition-transform"
                >
                  <MoreVertical size={20} className="text-gray-400" />
                </button>

                {/* Dropdown menu */}
                {activeMenu === ws.id && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)} />
                    <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden">
                      <button
                        onClick={() => goTo(ws.id)}
                        className="w-full px-4 py-3.5 flex items-center gap-3 text-left text-gray-900 hover:bg-gray-50 transition-colors"
                      >
                        <Briefcase size={18} className="text-gray-500" />
                        <span className="font-medium text-sm">Open workspace</span>
                      </button>
                      <button
                        onClick={() => handleDuplicateWorkspace(ws)}
                        className="w-full px-4 py-3.5 flex items-center gap-3 text-left text-gray-900 hover:bg-gray-50 transition-colors border-t border-gray-100"
                      >
                        <Copy size={18} className="text-gray-500" />
                        <span className="font-medium text-sm">Duplicate</span>
                      </button>
                      <button
                        onClick={() => { setDeleteTarget(ws); setActiveMenu(null) }}
                        className="w-full px-4 py-3.5 flex items-center gap-3 text-left text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
                      >
                        <Trash2 size={18} />
                        <span className="font-medium text-sm">Delete</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Delete confirmation modal ─────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => !deleting && setDeleteTarget(null)} />
          <div className="relative w-full max-w-sm mx-4 mb-8 bg-white rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Delete workspace?</h3>
            <p className="text-sm text-gray-500 mb-6">
              <span className="font-medium text-gray-700">{deleteTarget.name}</span> and all its data will be permanently removed. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteWorkspace}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-medium text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
