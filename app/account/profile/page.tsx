'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { ChevronLeft, User as UserIcon, ChevronRight, Camera } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function ProfilePage() {
  const router = useRouter()
  const { user } = useUser()

  return (
    <div className="min-h-screen bg-dark-300">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-dark-300 border-b border-gray-800">
        <div className="px-4 py-4 max-w-md mx-auto flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 active:scale-95 transition-transform"
          >
            <ChevronLeft size={24} className="text-gray-400" />
          </button>
          <UserIcon size={24} className="text-blue-400" />
          <h1 className="text-xl font-bold text-white flex-1">Profile</h1>
          <button className="p-2 active:scale-95 transition-transform">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="px-4 py-6 max-w-md mx-auto space-y-6">
        {/* Public Section */}
        <div className="space-y-4">
          <div>
            <h2 className="text-white text-lg font-semibold mb-1">Public</h2>
            <p className="text-gray-400 text-sm">
              These details are displayed on your public profile. Anyone can see them.
            </p>
          </div>

          {/* Avatar */}
          <div className="flex justify-center py-4">
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center overflow-hidden">
                {user?.imageUrl ? (
                  <img src={user.imageUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-6xl">🦁</span>
                )}
              </div>
              <button className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-dark-200 border-4 border-dark-300 flex items-center justify-center active:scale-95 transition-transform">
                <Camera size={18} className="text-gray-300" />
              </button>
            </div>
          </div>

          {/* Display name */}
          <button className="w-full bg-dark-200 rounded-xl border border-gray-800 p-4 active:bg-dark-100 transition-colors relative">
            <div className="text-left space-y-1">
              <div className="text-xs text-gray-400">Display name</div>
              <div className="text-white">{user?.fullName || user?.emailAddresses[0]?.emailAddress || ''}</div>
            </div>
            <ChevronRight size={20} className="text-gray-400 absolute right-6 top-1/2 -translate-y-1/2" />
          </button>

          {/* Contact methods */}
          <button className="w-full bg-dark-200 rounded-xl border border-gray-800 p-4 active:bg-dark-100 transition-colors relative">
            <div className="text-left space-y-1">
              <div className="text-xs text-gray-400">Contact methods</div>
              <div className="text-white">{user?.emailAddresses[0]?.emailAddress || ''}</div>
            </div>
            <ChevronRight size={20} className="text-gray-400 absolute right-6 top-1/2 -translate-y-1/2" />
          </button>

          {/* Status */}
          <button className="w-full bg-dark-200 rounded-xl border border-gray-800 p-4 active:bg-dark-100 transition-colors relative">
            <div className="text-left space-y-1">
              <div className="text-xs text-gray-400">Status</div>
              <div className="text-white"></div>
            </div>
            <ChevronRight size={20} className="text-gray-400 absolute right-6 top-1/2 -translate-y-1/2" />
          </button>

          {/* Pronouns */}
          <button className="w-full bg-dark-200 rounded-xl border border-gray-800 p-4 active:bg-dark-100 transition-colors relative">
            <div className="text-left space-y-1">
              <div className="text-xs text-gray-400">Pronouns</div>
              <div className="text-white">Select your pronouns</div>
            </div>
            <ChevronRight size={20} className="text-gray-400 absolute right-6 top-1/2 -translate-y-1/2" />
          </button>

          {/* Timezone */}
          <button className="w-full bg-dark-200 rounded-xl border border-gray-800 p-4 active:bg-dark-100 transition-colors relative">
            <div className="text-left space-y-1">
              <div className="text-xs text-gray-400">Timezone</div>
              <div className="text-white">America/New_York</div>
            </div>
            <ChevronRight size={20} className="text-gray-400 absolute right-6 top-1/2 -translate-y-1/2" />
          </button>

          {/* Share button */}
          <button className="px-6 py-3 rounded-xl bg-dark-200 border border-gray-800 text-white font-medium active:scale-[0.98] transition-transform flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Share
          </button>
        </div>

        {/* Private Section */}
        <div className="space-y-4 pt-4">
          <div>
            <h2 className="text-white text-lg font-semibold mb-1">Private</h2>
            <p className="text-gray-400 text-sm">
              These details are used for travel and payments. They're never shown on your public profile.
            </p>
          </div>

          {/* Legal name */}
          <button className="w-full bg-dark-200 rounded-xl border border-gray-800 p-4 active:bg-dark-100 transition-colors relative">
            <div className="text-left space-y-1">
              <div className="text-xs text-gray-400">Legal name</div>
              <div className="text-white"></div>
            </div>
            <ChevronRight size={20} className="text-gray-400 absolute right-6 top-1/2 -translate-y-1/2" />
          </button>

          {/* Date of birth */}
          <button className="w-full bg-dark-200 rounded-xl border border-gray-800 p-4 active:bg-dark-100 transition-colors relative">
            <div className="text-left space-y-1">
              <div className="text-xs text-gray-400">Date of birth</div>
              <div className="text-white"></div>
            </div>
            <ChevronRight size={20} className="text-gray-400 absolute right-6 top-1/2 -translate-y-1/2" />
          </button>

          {/* Phone number */}
          <button className="w-full bg-dark-200 rounded-xl border border-gray-800 p-4 active:bg-dark-100 transition-colors relative">
            <div className="text-left space-y-1">
              <div className="text-xs text-gray-400">Phone number</div>
              <div className="text-white"></div>
            </div>
            <ChevronRight size={20} className="text-gray-400 absolute right-6 top-1/2 -translate-y-1/2" />
          </button>

          {/* Address */}
          <button className="w-full bg-dark-200 rounded-xl border border-gray-800 p-4 active:bg-dark-100 transition-colors relative">
            <div className="text-left space-y-1">
              <div className="text-xs text-gray-400">Address</div>
              <div className="text-white"></div>
            </div>
            <ChevronRight size={20} className="text-gray-400 absolute right-6 top-1/2 -translate-y-1/2" />
          </button>
        </div>
      </div>
    </div>
  )
}
