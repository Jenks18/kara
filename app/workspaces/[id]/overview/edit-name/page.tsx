'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function EditNamePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [workspaceId, setWorkspaceId] = useState<string>('')
  const [workspaceName, setWorkspaceName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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
          setWorkspaceName(data.workspace.name)
        }
      } catch (error) {
        console.error('Error fetching workspace:', error)
      }
      setLoading(false)
    }

    fetchWorkspace()
  }, [workspaceId])

  const handleSave = async () => {
    if (!workspaceName.trim()) return

    setSaving(true)
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: workspaceName.trim() })
      })

      if (response.ok) {
        router.back()
      } else {
        alert('Failed to update workspace name')
      }
    } catch (error) {
      console.error('Error updating workspace:', error)
      alert('Failed to update workspace name')
    } finally {
      setSaving(false)
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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-emerald-200">
        <div className="px-4 py-4 max-w-md mx-auto flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 active:scale-95 transition-transform"
          >
            <ChevronLeft size={24} className="text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 flex-1">Workspace name</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-6 max-w-md mx-auto w-full">
        <input
          type="text"
          value={workspaceName}
          onChange={(e) => setWorkspaceName(e.target.value)}
          placeholder="Workspace name"
          className="w-full px-4 py-3 border-2 border-emerald-500 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:border-emerald-600"
        />
      </div>

      {/* Save Button */}
      <div className="sticky bottom-0 p-4 bg-gradient-to-t from-emerald-50 to-transparent">
        <button
          onClick={handleSave}
          disabled={!workspaceName.trim() || saving}
          className="w-full max-w-md mx-auto block py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-2xl active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}
