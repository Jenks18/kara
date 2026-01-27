'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { ChevronLeft, User as UserIcon, ChevronRight, Camera, Upload, X } from 'lucide-react'
import { useAvatar } from '@/contexts/AvatarContext'

export const dynamic = 'force-dynamic'

const AVATAR_OPTIONS = [
  { emoji: '🚗', color: 'from-blue-400 to-blue-500' },
  { emoji: '🐾', color: 'from-blue-500 to-blue-600' },
  { emoji: '🏃', color: 'from-blue-600 to-blue-700' },
  { emoji: '🐙', color: 'from-blue-700 to-blue-800' },
  { emoji: '🐵', color: 'from-blue-800 to-blue-900' },
  { emoji: '🏆', color: 'from-blue-500 to-blue-600' },
  { emoji: '🏁', color: 'from-blue-600 to-blue-700' },
  { emoji: '🦖', color: 'from-blue-700 to-blue-800' },
  { emoji: '👽', color: 'from-green-400 to-green-500' },
  { emoji: '🤢', color: 'from-green-500 to-green-600' },
  { emoji: '🌿', color: 'from-emerald-400 to-emerald-500' },
  { emoji: '🐸', color: 'from-emerald-500 to-emerald-600' },
  { emoji: '🦎', color: 'from-emerald-600 to-emerald-700' },
  { emoji: '🥒', color: 'from-emerald-500 to-emerald-600' },
  { emoji: '🚀', color: 'from-emerald-600 to-emerald-700' },
  { emoji: '🌳', color: 'from-green-700 to-green-800' },
  { emoji: '👓', color: 'from-yellow-300 to-yellow-400' },
  { emoji: '🦁', color: 'from-yellow-400 to-yellow-500' },
  { emoji: '🏃', color: 'from-yellow-500 to-yellow-600' },
  { emoji: '🐥', color: 'from-yellow-400 to-yellow-500' },
  { emoji: '🏅', color: 'from-yellow-500 to-yellow-600' },
  { emoji: '🏆', color: 'from-orange-400 to-orange-500' },
  { emoji: '🐠', color: 'from-brown-500 to-brown-600' },
  { emoji: '🦀', color: 'from-orange-500 to-orange-600' },
  { emoji: '🔥', color: 'from-orange-600 to-orange-700' },
  { emoji: '👹', color: 'from-orange-700 to-orange-800' },
  { emoji: '🦊', color: 'from-orange-500 to-orange-600' },
  { emoji: '🚧', color: 'from-red-600 to-red-700' },
  { emoji: '🐉', color: 'from-red-700 to-red-800' },
  { emoji: '👓', color: 'from-pink-300 to-pink-400' },
  { emoji: '🐷', color: 'from-pink-400 to-pink-500' },
  { emoji: '🏃', color: 'from-pink-500 to-pink-600' },
]

export default function ProfilePage() {
  const router = useRouter()
  const { user } = useUser()
  const { avatar, setAvatar } = useAvatar()
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)

  const handleAvatarSelect = (selectedAvatar: typeof AVATAR_OPTIONS[0]) => {
    setAvatar(selectedAvatar)
    setShowAvatarPicker(false)
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
          <button className="w-full bg-white rounded-xl border border-gray-200 p-4 active:bg-gray-50 transition-colors relative shadow-sm touch-manipulation">
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

          {/* Pronouns */}
          <button className="w-full bg-white rounded-xl border border-gray-200 p-4 active:bg-gray-50 transition-colors relative shadow-sm touch-manipulation">
            <div className="text-left space-y-1">
              <div className="text-xs text-gray-500">Pronouns</div>
              <div className="text-gray-900">Select your pronouns</div>
            </div>
            <ChevronRight size={20} className="text-gray-400 absolute right-6 top-1/2 -translate-y-1/2" />
          </button>

          {/* Timezone */}
          <button className="w-full bg-white rounded-xl border border-gray-200 p-4 active:bg-gray-50 transition-colors relative shadow-sm touch-manipulation">
            <div className="text-left space-y-1">
              <div className="text-xs text-gray-500">Timezone</div>
              <div className="text-gray-900">America/New_York</div>
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
          <button className="w-full bg-white rounded-xl border border-gray-200 p-4 active:bg-gray-50 transition-colors relative shadow-sm touch-manipulation">
            <div className="text-left space-y-1">
              <div className="text-xs text-gray-500">Legal name</div>
              <div className="text-gray-900"></div>
            </div>
            <ChevronRight size={20} className="text-gray-400 absolute right-6 top-1/2 -translate-y-1/2" />
          </button>

          {/* Date of birth */}
          <button className="w-full bg-white rounded-xl border border-gray-200 p-4 active:bg-gray-50 transition-colors relative shadow-sm touch-manipulation">
            <div className="text-left space-y-1">
              <div className="text-xs text-gray-500">Date of birth</div>
              <div className="text-gray-900"></div>
            </div>
            <ChevronRight size={20} className="text-gray-400 absolute right-6 top-1/2 -translate-y-1/2" />
          </button>

          {/* Phone number */}
          <button className="w-full bg-white rounded-xl border border-gray-200 p-4 active:bg-gray-50 transition-colors relative shadow-sm touch-manipulation">
            <div className="text-left space-y-1">
              <div className="text-xs text-gray-500">Phone number</div>
              <div className="text-gray-900"></div>
            </div>
            <ChevronRight size={20} className="text-gray-400 absolute right-6 top-1/2 -translate-y-1/2" />
          </button>

          {/* Address */}
          <button className="w-full bg-white rounded-xl border border-gray-200 p-4 active:bg-gray-50 transition-colors relative shadow-sm touch-manipulation">
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
            className="bg-gradient-to-br from-emerald-900 to-green-900 w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxHeight: '85vh',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {/* Header */}
            <div className="sticky top-0 bg-emerald-900/95 backdrop-blur-sm border-b border-emerald-700 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">Edit profile picture</h3>
              <button
                onClick={() => setShowAvatarPicker(false)}
                className="p-2 hover:bg-emerald-800 rounded-full transition-colors touch-manipulation"
              >
                <X size={24} className="text-gray-300" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 80px)' }}>
              {/* Upload button */}
              <button className="w-full mb-6 px-6 py-4 bg-emerald-800 hover:bg-emerald-700 rounded-2xl text-white font-medium flex items-center justify-center gap-3 transition-colors touch-manipulation">
                <Upload size={24} />
                Upload photo
              </button>

              <p className="text-gray-300 text-sm mb-4">Or choose a custom avatar</p>

              {/* Avatar Grid */}
              <div className="grid grid-cols-5 gap-3">
                {AVATAR_OPTIONS.map((avatarOption, index) => (
                  <button
                    key={index}
                    onClick={() => handleAvatarSelect(avatarOption)}
                    className={`aspect-square rounded-full bg-gradient-to-br ${avatarOption.color} flex items-center justify-center text-3xl hover:scale-110 active:scale-95 transition-transform touch-manipulation shadow-lg ${
                      avatar.emoji === avatarOption.emoji && avatar.color === avatarOption.color
                        ? 'ring-4 ring-white ring-offset-2 ring-offset-emerald-900'
                        : ''
                    }`}
                  >
                    {avatarOption.emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-emerald-900/95 backdrop-blur-sm border-t border-emerald-700 p-6">
              <button
                onClick={() => setShowAvatarPicker(false)}
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
