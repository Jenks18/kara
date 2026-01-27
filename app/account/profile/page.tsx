'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { ChevronLeft, User as UserIcon, ChevronRight, Camera, Upload, X } from 'lucide-react'
import { useAvatar } from '@/contexts/AvatarContext'

export const dynamic = 'force-dynamic'

const AVATAR_OPTIONS = [
  { emoji: '�', color: 'from-gray-400 to-gray-500', label: 'Default' },
  { emoji: '💼', color: 'from-blue-500 to-blue-600', label: 'Business' },
  { emoji: '🎯', color: 'from-red-500 to-red-600', label: 'Target' },
  { emoji: '📊', color: 'from-emerald-500 to-emerald-600', label: 'Analytics' },
  { emoji: '🏢', color: 'from-slate-500 to-slate-600', label: 'Corporate' },
  { emoji: '💡', color: 'from-yellow-500 to-yellow-600', label: 'Innovation' },
  { emoji: '🎓', color: 'from-indigo-500 to-indigo-600', label: 'Education' },
  { emoji: '⚡', color: 'from-amber-500 to-amber-600', label: 'Energy' },
  { emoji: '🔧', color: 'from-gray-600 to-gray-700', label: 'Tools' },
  { emoji: '📈', color: 'from-green-500 to-green-600', label: 'Growth' },
  { emoji: '🌟', color: 'from-yellow-400 to-yellow-500', label: 'Star' },
  { emoji: '🎨', color: 'from-purple-500 to-purple-600', label: 'Creative' },
  { emoji: '🚀', color: 'from-blue-600 to-blue-700', label: 'Launch' },
  { emoji: '💻', color: 'from-cyan-500 to-cyan-600', label: 'Tech' },
  { emoji: '📱', color: 'from-teal-500 to-teal-600', label: 'Mobile' },
  { emoji: '🌐', color: 'from-blue-400 to-blue-500', label: 'Global' },
  { emoji: '🔒', color: 'from-red-600 to-red-700', label: 'Security' },
  { emoji: '✅', color: 'from-emerald-600 to-emerald-700', label: 'Success' },
  { emoji: '⭐', color: 'from-orange-400 to-orange-500', label: 'Premium' },
  { emoji: '🎯', color: 'from-pink-500 to-pink-600', label: 'Focus' },
  { emoji: '📍', color: 'from-red-400 to-red-500', label: 'Location' },
  { emoji: '🏆', color: 'from-yellow-600 to-yellow-700', label: 'Achievement' },
  { emoji: '💎', color: 'from-cyan-600 to-cyan-700', label: 'Premium' },
  { emoji: '🎪', color: 'from-rose-500 to-rose-600', label: 'Event' },
  { emoji: '🌈', color: 'from-pink-400 to-pink-500', label: 'Diversity' },
  { emoji: '⚙️', color: 'from-slate-600 to-slate-700', label: 'Settings' },
  { emoji: '📋', color: 'from-gray-500 to-gray-600', label: 'Tasks' },
  { emoji: '🔔', color: 'from-orange-500 to-orange-600', label: 'Notifications' },
  { emoji: '🌍', color: 'from-green-600 to-green-700', label: 'World' },
  { emoji: '⏱️', color: 'from-blue-500 to-blue-600', label: 'Time' },
]

export default function ProfilePage() {
  const router = useRouter()
  const { user } = useUser()
  const { avatar, setAvatar } = useAvatar()
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [selectedTempAvatar, setSelectedTempAvatar] = useState(avatar)

  const handleAvatarSelect = (selectedAvatar: typeof AVATAR_OPTIONS[0]) => {
    setSelectedTempAvatar(selectedAvatar)
  }

  const handleSaveAvatar = () => {
    setAvatar(selectedTempAvatar)
    setShowAvatarPicker(false)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // TODO: Upload to storage and update user profile
      console.log('File selected:', file)
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
              <div className={`w-32 h-32 rounded-full bg-gradient-to-br ${avatar.color} flex items-center justify-center overflow-hidden shadow-lg`}>
                {user?.imageUrl ? (
                  <img src={user.imageUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-6xl">{avatar.emoji}</span>
                )}
              </div>
              <button 
                onClick={() => setShowAvatarPicker(true)}
                className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-emerald-600 border-4 border-white flex items-center justify-center active:scale-95 transition-transform shadow-lg touch-manipulation"
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
              <div className="text-gray-900">{user?.fullName || user?.emailAddresses[0]?.emailAddress || ''}</div>
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
              <div className="text-gray-900"></div>
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
              <div className="text-gray-900"></div>
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
              <div className="text-gray-900"></div>
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
              <div className="text-gray-900"></div>
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
