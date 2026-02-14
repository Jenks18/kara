'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { ChevronLeft, User as UserIcon, ChevronRight, Camera, Upload, X } from 'lucide-react'
import { useAvatar } from '@/contexts/AvatarContext'
import { getUserProfile } from '@/lib/api/user-profiles'

export const dynamic = 'force-dynamic'

// Format ISO date to Kenyan display (DD/MM/YYYY)
function formatDateKenyan(isoDate: string): string {
  if (!isoDate) return ''
  const parts = isoDate.split('-')
  if (parts.length !== 3) return isoDate
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

const AVATAR_OPTIONS = [
  { emoji: '🐻', color: 'from-amber-700 to-amber-800', label: 'Bear' },
  { emoji: '🦁', color: 'from-orange-600 to-orange-700', label: 'Lion' },
  { emoji: '🐯', color: 'from-orange-700 to-orange-800', label: 'Tiger' },
  { emoji: '🦊', color: 'from-red-600 to-red-700', label: 'Fox' },
  { emoji: '🐺', color: 'from-slate-700 to-slate-800', label: 'Wolf' },
  { emoji: '🦅', color: 'from-yellow-700 to-yellow-800', label: 'Eagle' },
  { emoji: '🦉', color: 'from-indigo-700 to-indigo-800', label: 'Owl' },
  { emoji: '🐧', color: 'from-slate-600 to-slate-700', label: 'Penguin' },
  { emoji: '🐘', color: 'from-gray-700 to-gray-800', label: 'Elephant' },
  { emoji: '🦏', color: 'from-stone-700 to-stone-800', label: 'Rhino' },
  { emoji: '🦒', color: 'from-amber-600 to-amber-700', label: 'Giraffe' },
  { emoji: '🦓', color: 'from-zinc-700 to-zinc-800', label: 'Zebra' },
  { emoji: '🐆', color: 'from-yellow-600 to-yellow-700', label: 'Leopard' },
  { emoji: '🦈', color: 'from-cyan-700 to-cyan-800', label: 'Shark' },
  { emoji: '🐙', color: 'from-purple-700 to-purple-800', label: 'Octopus' },
  { emoji: '🐬', color: 'from-blue-700 to-blue-800', label: 'Dolphin' },
  { emoji: '🐳', color: 'from-sky-700 to-sky-800', label: 'Whale' },
  { emoji: '🦭', color: 'from-slate-600 to-slate-700', label: 'Seal' },
  { emoji: '🦦', color: 'from-teal-700 to-teal-800', label: 'Otter' },
  { emoji: '🦘', color: 'from-yellow-700 to-amber-700', label: 'Kangaroo' },
  { emoji: '🦌', color: 'from-amber-700 to-orange-700', label: 'Deer' },
  { emoji: '🐎', color: 'from-stone-700 to-stone-800', label: 'Horse' },
  { emoji: '🦬', color: 'from-zinc-700 to-gray-800', label: 'Bison' },
  { emoji: '🦣', color: 'from-gray-700 to-slate-800', label: 'Mammoth' },
  { emoji: '🐿️', color: 'from-orange-600 to-amber-700', label: 'Squirrel' },
  { emoji: '🦔', color: 'from-amber-600 to-orange-600', label: 'Hedgehog' },
  { emoji: '🐢', color: 'from-emerald-700 to-emerald-800', label: 'Turtle' },
  { emoji: '🐊', color: 'from-green-700 to-green-800', label: 'Crocodile' },
  { emoji: '🦜', color: 'from-emerald-600 to-emerald-700', label: 'Parrot' },
  { emoji: '🦚', color: 'from-blue-600 to-blue-700', label: 'Peacock' },
]

export default function ProfilePage() {
  const router = useRouter()
  const { user } = useUser()
  const { avatar, setAvatar, isLoading } = useAvatar()
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [selectedTempAvatar, setSelectedTempAvatar] = useState(avatar)
  const [displayName, setDisplayName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [legalName, setLegalName] = useState('')
  const [address, setAddress] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  
  // Load profile data from database
  useEffect(() => {
    async function loadProfile() {
      if (!user?.id) return
      
      try {
        const profile = await getUserProfile(user.id)
        if (profile) {
          setDisplayName(profile.display_name || '')
          setPhoneNumber(profile.phone_number || '')
          setDateOfBirth(profile.date_of_birth || '')
          
          // Legal name
          const legalFirst = profile.legal_first_name || ''
          const legalLast = profile.legal_last_name || ''
          if (legalFirst || legalLast) {
            setLegalName(`${legalFirst} ${legalLast}`.trim())
          }
          
          // Address
          const addressParts = [
            profile.address_line1,
            profile.city,
            profile.state,
            profile.zip_code
          ].filter(Boolean)
          if (addressParts.length > 0) {
            setAddress(addressParts.join(', '))
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error)
      }
    }
    
    loadProfile()
  }, [user?.id])
  
  // Sync temp avatar when context avatar changes
  useEffect(() => {
    setSelectedTempAvatar(avatar)
  }, [avatar])

  const handleAvatarSelect = (selectedAvatar: typeof AVATAR_OPTIONS[0]) => {
    setSelectedTempAvatar(selectedAvatar)
  }

  const handleSaveAvatar = () => {
    setAvatar(selectedTempAvatar)
    setShowAvatarPicker(false)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user?.id) return

    setUploadingAvatar(true)
    try {
      // Upload file to storage
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload-avatar', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const { url } = await response.json()

      // Update user profile with image URL
      const { updateUserProfile } = await import('@/lib/api/user-profiles')
      await updateUserProfile(user.id, {
        avatar_image_url: url,
        user_email: user.emailAddresses[0]?.emailAddress || '',
      })

      // Update avatar context with the image URL
      setAvatar({
        emoji: '📷',
        color: 'from-gray-400 to-gray-500',
        label: 'Custom',
        imageUrl: url,
      })

      setShowAvatarPicker(false)
      alert('Profile picture updated successfully!')
    } catch (error) {
      alert('Failed to upload profile picture. Please try again.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
      
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="px-4 py-4 max-w-md mx-auto flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 active:scale-95 transition-transform touch-manipulation"
          >
            <ChevronLeft size={24} className="text-gray-700" />
          </button>
          <UserIcon size={24} className="text-emerald-600" />
          <h1 className="text-xl font-semibold text-gray-900 flex-1">Profile</h1>
        </div>
      </div>
      
      {/* Content */}
      <div className="px-4 py-6 max-w-md mx-auto space-y-6 pb-24">
        {/* Public Section */}
        <div className="space-y-4">
          <div>
            <h2 className="text-gray-900 text-lg font-semibold mb-1">Public</h2>
            <p className="text-gray-600 text-sm">
              These details are displayed on your public profile. Anyone can see them.
            </p>
          </div>

          {/* Avatar */}
          <div className="flex justify-center py-4">
            <div className="relative">
              <div className={`w-32 h-32 rounded-full bg-gradient-to-br ${avatar.imageUrl ? 'bg-gray-100' : avatar.color} flex items-center justify-center overflow-hidden shadow-lg`}>
                {avatar.imageUrl ? (
                  <img 
                    src={avatar.imageUrl} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-6xl">{avatar.emoji}</span>
                )}
              </div>
              <button 
                onClick={() => setShowAvatarPicker(true)}
                className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-emerald-600 border-4 border-white flex items-center justify-center active:scale-95 transition-transform shadow-lg touch-manipulation"
                disabled={uploadingAvatar}
              >
                <Camera size={18} className="text-white" />
              </button>
            </div>
          </div>

          {/* Display name */}
          <button 
            onClick={() => router.push('/account/profile/display-name')}
            className="w-full bg-white rounded-xl border border-gray-200 p-4 active:bg-gray-50 transition-colors relative shadow-sm touch-manipulation"
          >
            <div className="text-left space-y-1">
              <div className="text-xs text-gray-500">Display name</div>
              <div className="text-gray-900">{displayName || user?.fullName || 'Not set'}</div>
            </div>
            <ChevronRight size={20} className="text-gray-400 absolute right-6 top-1/2 -translate-y-1/2" />
          </button>

          {/* Contact methods */}
          <button className="w-full bg-white rounded-xl border border-gray-200 p-4 active:bg-gray-50 transition-colors relative shadow-sm touch-manipulation">
            <div className="text-left space-y-1">
              <div className="text-xs text-gray-500">Contact methods</div>
              <div className="text-gray-900">{user?.emailAddresses[0]?.emailAddress || ''}</div>
            </div>
            <ChevronRight size={20} className="text-gray-400 absolute right-6 top-1/2 -translate-y-1/2" />
          </button>
        </div>

        {/* Private Section */}
        <div className="space-y-4 pt-4">
          <div>
            <h2 className="text-gray-900 text-lg font-semibold mb-1">Private</h2>
            <p className="text-gray-600 text-sm">
              These details are used for travel and payments. They're never shown on your public profile.
            </p>
          </div>

          {/* Legal name */}
          <button 
            onClick={() => router.push('/account/profile/legal-name')}
            className="w-full bg-white rounded-xl border border-gray-200 p-4 active:bg-gray-50 transition-colors relative shadow-sm touch-manipulation"
          >
            <div className="text-left space-y-1">
              <div className="text-xs text-gray-500">Legal name</div>
              <div className="text-gray-900">{legalName || 'Not set'}</div>
            </div>
            <ChevronRight size={20} className="text-gray-400 absolute right-6 top-1/2 -translate-y-1/2" />
          </button>

          {/* Date of birth */}
          <button 
            onClick={() => router.push('/account/profile/date-of-birth')}
            className="w-full bg-white rounded-xl border border-gray-200 p-4 active:bg-gray-50 transition-colors relative shadow-sm touch-manipulation"
          >
            <div className="text-left space-y-1">
              <div className="text-xs text-gray-500">Date of birth</div>
              <div className="text-gray-900">{dateOfBirth ? formatDateKenyan(dateOfBirth) : 'Not set'}</div>
            </div>
            <ChevronRight size={20} className="text-gray-400 absolute right-6 top-1/2 -translate-y-1/2" />
          </button>

          {/* Phone number */}
          <button 
            onClick={() => router.push('/account/profile/phone-number')}
            className="w-full bg-white rounded-xl border border-gray-200 p-4 active:bg-gray-50 transition-colors relative shadow-sm touch-manipulation"
          >
            <div className="text-left space-y-1">
              <div className="text-xs text-gray-500">Phone number</div>
              <div className="text-gray-900">{phoneNumber || 'Not set'}</div>
            </div>
            <ChevronRight size={20} className="text-gray-400 absolute right-6 top-1/2 -translate-y-1/2" />
          </button>

          {/* Address */}
          <button 
            onClick={() => router.push('/account/profile/address')}
            className="w-full bg-white rounded-xl border border-gray-200 p-4 active:bg-gray-50 transition-colors relative shadow-sm touch-manipulation"
          >
            <div className="text-left space-y-1">
              <div className="text-xs text-gray-500">Address</div>
              <div className="text-gray-900">{address || 'Not set'}</div>
            </div>
            <ChevronRight size={20} className="text-gray-400 absolute right-6 top-1/2 -translate-y-1/2" />
          </button>
        </div>
      </div>

      {/* Avatar Picker Modal */}
      {showAvatarPicker && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowAvatarPicker(false)}>
          <div 
            className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxHeight: '85vh',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Edit profile picture</h3>
              <button
                onClick={() => setShowAvatarPicker(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors touch-manipulation"
              >
                <X size={24} className="text-gray-600" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 160px)' }}>
              {/* Upload button */}
              <label className="w-full mb-6 px-6 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl text-white font-medium flex items-center justify-center gap-3 transition-colors touch-manipulation cursor-pointer">
                <Upload size={24} />
                Upload photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <p className="text-gray-600 text-sm mb-4">Or choose a custom avatar</p>

              {/* Avatar Grid */}
              <div className="grid grid-cols-5 gap-3">
                {AVATAR_OPTIONS.map((avatarOption, index) => (
                  <button
                    key={index}
                    onClick={() => handleAvatarSelect(avatarOption)}
                    className={`aspect-square rounded-full bg-gradient-to-br ${avatarOption.color} flex items-center justify-center text-3xl hover:scale-110 active:scale-95 transition-transform touch-manipulation shadow-lg ${
                      selectedTempAvatar.emoji === avatarOption.emoji && selectedTempAvatar.color === avatarOption.color
                        ? 'ring-4 ring-emerald-600 ring-offset-2'
                        : ''
                    }`}
                    title={avatarOption.label}
                  >
                    {avatarOption.emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6">
              <button
                onClick={handleSaveAvatar}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl text-white font-semibold text-lg active:scale-[0.98] transition-all touch-manipulation"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
