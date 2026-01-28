'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function EditAddressPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [workspaceId, setWorkspaceId] = useState<string>('')
  const [address, setAddress] = useState({
    line1: '',
    line2: '',
    city: '',
    state: '',
    zipcode: '',
    country: ''
  })
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
          // For now, just store as single string. Can parse later if needed
          setAddress({ ...address, line1: data.workspace.address || '' })
        }
      } catch (error) {
        console.error('Error fetching workspace:', error)
      }
      setLoading(false)
    }

    fetchWorkspace()
  }, [workspaceId])

  const handleSave = async () => {
    setSaving(true)
    try {
      // Combine address fields into single string for now
      const fullAddress = [address.line1, address.line2, address.city, address.state, address.zipcode, address.country]
        .filter(Boolean)
        .join(', ')

      const response = await fetch(`/api/workspaces/${workspaceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: fullAddress })
      })

      if (response.ok) {
        router.back()
      } else {
        alert('Failed to update address')
      }
    } catch (error) {
      console.error('Error updating workspace:', error)
      alert('Failed to update address')
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
          <h1 className="text-xl font-bold text-gray-900 flex-1">Company address</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-6 max-w-md mx-auto w-full space-y-4">
        <input
          type="text"
          value={address.line1}
          onChange={(e) => setAddress({ ...address, line1: e.target.value })}
          placeholder="Address line 1"
          className="w-full px-4 py-3 border-2 border-emerald-500 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:border-emerald-600"
        />
        
        <input
          type="text"
          value={address.line2}
          onChange={(e) => setAddress({ ...address, line2: e.target.value })}
          placeholder="Address line 2"
          className="w-full px-4 py-3 border-2 border-emerald-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:border-emerald-600"
        />

        <button
          onClick={() => alert('Country selector coming soon')}
          className="w-full flex items-center justify-between px-4 py-3 border-2 border-emerald-200 rounded-xl text-left"
        >
          <span className="text-gray-500">Country</span>
          <ChevronRight size={20} className="text-gray-600" />
        </button>

        <input
          type="text"
          value={address.state}
          onChange={(e) => setAddress({ ...address, state: e.target.value })}
          placeholder="State / Province"
          className="w-full px-4 py-3 border-2 border-emerald-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:border-emerald-600"
        />

        <input
          type="text"
          value={address.city}
          onChange={(e) => setAddress({ ...address, city: e.target.value })}
          placeholder="City"
          className="w-full px-4 py-3 border-2 border-emerald-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:border-emerald-600"
        />

        <input
          type="text"
          value={address.zipcode}
          onChange={(e) => setAddress({ ...address, zipcode: e.target.value })}
          placeholder="Zip / Postcode"
          className="w-full px-4 py-3 border-2 border-emerald-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:border-emerald-600"
        />
      </div>

      {/* Save Button */}
      <div className="sticky bottom-0 p-4 bg-gradient-to-t from-emerald-50 to-transparent">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full max-w-md mx-auto block py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-2xl active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}
