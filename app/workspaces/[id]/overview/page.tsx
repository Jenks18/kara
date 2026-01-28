'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Building, Share2, Trash2, Camera, Image as ImageIcon, FileText, X, UserPlus, Download } from 'lucide-react'
import QRCode from 'react-qr-code'
import { getSupabaseClient } from '@/lib/supabase/client'

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
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showAvatarMenu, setShowAvatarMenu] = useState(false)
  const [inviteInput, setInviteInput] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

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
    setShowInviteModal(true)
    setShowMoreMenu(false)
  }

  const handleShare = () => {
    setShowShareModal(true)
    setShowMoreMenu(false)
  }

  const handleDelete = () => {
    setShowDeleteModal(true)
    setShowMoreMenu(false)
  }

  const handleConfirmDelete = async () => {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        router.push('/workspaces')
      } else {
        alert('Failed to delete workspace')
      }
    } catch (error) {
      console.error('Error deleting workspace:', error)
      alert('Failed to delete workspace')
    }
  }

  const handleAvatarChange = (method: 'camera' | 'gallery' | 'file') => {
    setShowAvatarMenu(false)
    if (method === 'camera') {
      cameraInputRef.current?.click()
    } else if (method === 'gallery') {
      galleryInputRef.current?.click()
    } else if (method === 'file') {
      fileInputRef.current?.click()
    }
  }

  const handleRemoveAvatar = async () => {
    setShowAvatarMenu(false)
    setUploadingAvatar(true)

    try {
      // Update workspace to remove avatar (set to empty string or workspace initial)
      const response = await fetch(`/api/workspaces/${workspaceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: workspace?.name?.charAt(0) || 'W' })
      })

      if (response.ok) {
        const data = await response.json()
        setWorkspace(data.workspace)
        alert('Image removed successfully!')
      } else {
        alert('Failed to remove image')
      }
    } catch (error) {
      console.error('Error removing avatar:', error)
      alert('Failed to remove image')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !workspace) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB')
      return
    }

    setUploadingAvatar(true)

    try {
      // Get fresh Supabase client with valid token
      const supabase = await getSupabaseClient()
      
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${workspaceId}-${Date.now()}.${fileExt}`
      const filePath = fileName // Remove duplicate 'workspace-avatars/' prefix

      const { error: uploadError } = await supabase.storage
        .from('workspace-avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        alert('Failed to upload image')
        return
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('workspace-avatars')
        .getPublicUrl(filePath)

      // Update workspace with new avatar URL
      const response = await fetch(`/api/workspaces/${workspaceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: publicUrl })
      })

      if (response.ok) {
        const data = await response.json()
        setWorkspace(data.workspace)
        alert('Image updated successfully!')
      } else {
        alert('Failed to update image')
      }
    } catch (error) {
      console.error('Error uploading avatar:', error)
      alert('Failed to upload avatar')
    } finally {
      setUploadingAvatar(false)
      // Reset input
      if (event.target) event.target.value = ''
    }
  }

  const downloadQRCode = () => {
    const svg = document.getElementById('workspace-qr-code')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx?.drawImage(img, 0, 0)
      const pngFile = canvas.toDataURL('image/png')

      const downloadLink = document.createElement('a')
      downloadLink.download = `${workspace?.name || 'workspace'}-qr-code.png`
      downloadLink.href = pngFile
      downloadLink.click()
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
  }

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/workspaces/${workspaceId}/join` : ''

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
          <Building size={24} className="text-emerald-600" />
          <h1 className="text-xl font-bold text-gray-900 flex-1">Overview</h1>
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
                <button
                  onClick={handleDelete}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-50 transition-colors text-left border-t border-gray-100"
                >
                  <Trash2 size={20} className="text-red-600" />
                  <span className="text-red-600 font-medium">Delete</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Workspace Avatar */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center overflow-hidden">
              {workspace.avatar?.startsWith('http') ? (
                <img 
                  src={workspace.avatar} 
                  alt={workspace.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-4xl font-bold text-white">{workspace.avatar || workspace.name?.charAt(0) || 'W'}</span>
              )}
            </div>
            <button 
              onClick={() => setShowAvatarMenu(true)}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white border border-emerald-200 flex items-center justify-center active:scale-95 transition-transform shadow-sm"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="space-y-4">
          {/* Workspace name */}
          <button 
            onClick={() => router.push(`/workspaces/${workspaceId}/overview/edit-name`)}
            className="w-full bg-white rounded-xl border border-emerald-200 p-4 hover:bg-emerald-50 transition-colors shadow-sm relative"
          >
            <div className="text-left space-y-1">
              <div className="text-xs text-gray-600">Workspace name</div>
              <div className="text-gray-900 font-semibold">{workspace.name}</div>
            </div>
            <ChevronRight size={20} className="text-gray-600 absolute right-6 top-1/2 -translate-y-1/2" />
          </button>

          {/* Description */}
          <button 
            onClick={() => router.push(`/workspaces/${workspaceId}/overview/edit-description`)}
            className="w-full bg-white rounded-xl border border-emerald-200 p-4 hover:bg-emerald-50 transition-colors relative shadow-sm"
          >
            <div className="text-left space-y-1">
              <div className="text-xs text-gray-600">Description</div>
              <div className="text-gray-900">
                {workspace.description || 'One place for all your receipts and expenses.'}
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-600 absolute right-6 top-1/2 -translate-y-1/2" />
          </button>

          {/* Default currency */}
          <button 
            onClick={() => router.push(`/workspaces/${workspaceId}/overview/edit-currency`)}
            className="w-full bg-white rounded-xl border border-emerald-200 p-4 hover:bg-emerald-50 transition-colors relative shadow-sm"
          >
            <div className="text-left space-y-1">
              <div className="text-xs text-gray-600">Default currency</div>
              <div className="text-gray-900 font-semibold">{workspace.currency} - {workspace.currency_symbol}</div>
              <div className="text-xs text-gray-600 mt-2">
                All expenses on this workspace will be converted to this currency.
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-600 absolute right-6 top-6" />
          </button>

          {/* Company address */}
          <button 
            onClick={() => router.push(`/workspaces/${workspaceId}/overview/edit-address`)}
            className="w-full bg-white rounded-xl border border-emerald-200 p-4 hover:bg-emerald-50 transition-colors relative shadow-sm"
          >
            <div className="text-left space-y-1">
              <div className="text-xs text-gray-600">Company address</div>
              <div className="text-gray-900">{workspace.address || 'Add company address'}</div>
            </div>
            <ChevronRight size={20} className="text-gray-600 absolute right-6 top-1/2 -translate-y-1/2" />
          </button>
        </div>
      </div>

      {/* Avatar Change Menu Modal */}
      {showAvatarMenu && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end">
          <div className="w-full bg-white rounded-t-3xl animate-slide-up">
            <div className="p-6 space-y-2">
              <button
                onClick={() => handleAvatarChange('camera')}
                className="w-full py-4 flex items-center gap-4 text-gray-900 hover:bg-emerald-50 rounded-xl px-4 transition-colors"
              >
                <Camera size={24} className="text-emerald-600" />
                <span className="font-medium">Take photo</span>
              </button>
              <button
                onClick={() => handleAvatarChange('gallery')}
                className="w-full py-4 flex items-center gap-4 text-gray-900 hover:bg-emerald-50 rounded-xl px-4 transition-colors"
              >
                <ImageIcon size={24} className="text-emerald-600" />
                <span className="font-medium">Choose from gallery</span>
              </button>
              <button
                onClick={() => handleAvatarChange('file')}
                className="w-full py-4 flex items-center gap-4 text-gray-900 hover:bg-emerald-50 rounded-xl px-4 transition-colors"
              >
                <FileText size={24} className="text-emerald-600" />
                <span className="font-medium">Choose file</span>
              </button>
              {workspace?.avatar?.startsWith('http') && (
                <button
                  onClick={handleRemoveAvatar}
                  className="w-full py-4 flex items-center gap-4 text-red-600 hover:bg-red-50 rounded-xl px-4 transition-colors border-t border-gray-100 mt-2"
                >
                  <Trash2 size={24} className="text-red-600" />
                  <span className="font-medium">Remove image</span>
                </button>
              )}
              <button
                onClick={() => setShowAvatarMenu(false)}
                className="w-full py-4 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors mt-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
            <p className="text-sm text-gray-600">{workspace.name}</p>
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

      {/* Share Modal with QR Code */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Share workspace</h2>
              <button onClick={() => setShowShareModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} className="text-gray-600" />
              </button>
            </div>
            
            {/* Real QR Code */}
            <div className="flex justify-center py-8">
              <div className="p-4 bg-white border-4 border-emerald-600 rounded-2xl">
                <QRCode
                  id="workspace-qr-code"
                  value={shareUrl}
                  size={200}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  viewBox={`0 0 200 200`}
                  fgColor="#059669"
                  bgColor="#ffffff"
                />
              </div>
            </div>

            {/* Share URL */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <p className="text-xs text-gray-600 mb-2">Share link</p>
              <p className="text-sm text-gray-900 font-mono break-all">{shareUrl}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl)
                  alert('Link copied to clipboard!')
                }}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Share2 size={18} />
                Copy Link
              </button>
              <button
                onClick={downloadQRCode}
                className="flex-1 py-3 bg-white border-2 border-emerald-600 text-emerald-600 font-semibold rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Download size={18} />
                Download QR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 space-y-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 size={32} className="text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Delete workspace?</h2>
              <p className="text-gray-600">
                Are you sure you want to delete "{workspace.name}"? This action cannot be undone and all data will be permanently lost.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-xl active:scale-[0.98] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl active:scale-[0.98] transition-all"
              >
                Delete
              </button>
            </div>
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

      {/* Hidden file inputs for avatar upload */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture
        className="hidden"
        onChange={handleFileSelect}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  )
}
