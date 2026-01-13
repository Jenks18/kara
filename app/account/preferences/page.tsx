'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Settings, ChevronRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function PreferencesPage() {
  const router = useRouter()
  const [receiveUpdates, setReceiveUpdates] = useState(true)
  const [muteSounds, setMuteSounds] = useState(false)

  return (
    <div className="min-h-screen bg-[#121f16]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#121f16] border-b border-gray-800">
        <div className="px-4 py-4 max-w-md mx-auto flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 active:scale-95 transition-transform"
          >
            <ChevronLeft size={24} className="text-gray-400" />
          </button>
          <div className="flex gap-1">
            <Settings size={24} className="text-blue-400" />
            <Settings size={24} className="text-yellow-400" />
          </div>
          <h1 className="text-xl font-bold text-white flex-1">Preferences</h1>
          <button className="p-2 active:scale-95 transition-transform">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="px-4 py-6 max-w-md mx-auto space-y-6">
        {/* Illustration */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl overflow-hidden p-12">
          <div className="relative w-full h-48 flex items-center justify-center">
            {/* Control panel illustration */}
            <div className="w-56 h-40 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl shadow-2xl relative">
              {/* Screen */}
              <div className="absolute top-4 left-4 right-20 h-12 bg-green-900 rounded-lg border-4 border-purple-800"></div>
              {/* Buttons grid */}
              <div className="absolute top-20 left-4 grid grid-cols-2 gap-2">
                <div className="w-6 h-6 bg-orange-500 rounded"></div>
                <div className="w-6 h-6 bg-orange-500 rounded"></div>
                <div className="w-6 h-6 bg-orange-500 rounded"></div>
                <div className="w-6 h-6 bg-orange-500 rounded"></div>
              </div>
              {/* Sliders */}
              <div className="absolute top-6 right-4 space-y-3">
                <div className="flex flex-col gap-1">
                  <div className="w-12 h-2 bg-pink-400 rounded-full"></div>
                  <div className="w-12 h-2 bg-pink-400 rounded-full"></div>
                  <div className="w-12 h-2 bg-pink-400 rounded-full"></div>
                </div>
              </div>
              {/* Dial */}
              <div className="absolute bottom-4 right-4 w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-pink-600 border-4 border-pink-700"></div>
              {/* Hand */}
              <div className="absolute -bottom-2 -right-6 w-20 h-16 bg-gradient-to-br from-cyan-400 to-cyan-500 rounded-t-full transform rotate-12"></div>
            </div>
          </div>
        </div>

        {/* App preferences Section */}
        <div className="space-y-4">
          <h2 className="text-white text-lg font-semibold">App preferences</h2>

          {/* Receive updates */}
          <div className="flex items-start justify-between bg-dark-200 rounded-xl border border-gray-800 p-4">
            <div className="flex-1 pr-4">
              <div className="text-white font-medium">
                Receive relevant feature updates and Expensify news
              </div>
            </div>
            <button
              onClick={() => setReceiveUpdates(!receiveUpdates)}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors flex-shrink-0 ${
                receiveUpdates ? 'bg-primary' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  receiveUpdates ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Mute sounds */}
          <div className="flex items-start justify-between bg-dark-200 rounded-xl border border-gray-800 p-4">
            <div className="flex-1 pr-4">
              <div className="text-white font-medium">Mute all sounds from Expensify</div>
            </div>
            <button
              onClick={() => setMuteSounds(!muteSounds)}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors flex-shrink-0 ${
                muteSounds ? 'bg-primary' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  muteSounds ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Priority mode */}
          <button className="w-full bg-dark-200 rounded-xl border border-gray-800 p-4 active:bg-dark-100 transition-colors relative">
            <div className="text-left space-y-1">
              <div className="text-xs text-gray-400">Priority mode</div>
              <div className="text-white font-medium">Most recent</div>
            </div>
            <ChevronRight size={20} className="text-gray-400 absolute right-6 top-1/2 -translate-y-1/2" />
          </button>

          {/* Language */}
          <button className="w-full bg-dark-200 rounded-xl border border-gray-800 p-4 active:bg-dark-100 transition-colors relative">
            <div className="text-left space-y-1">
              <div className="text-xs text-gray-400">Language</div>
              <div className="text-white font-medium">English</div>
            </div>
            <ChevronRight size={20} className="text-gray-400 absolute right-6 top-1/2 -translate-y-1/2" />
          </button>

          {/* Payment currency */}
          <button className="w-full bg-dark-200 rounded-xl border border-gray-800 p-4 active:bg-dark-100 transition-colors relative">
            <div className="text-left space-y-1">
              <div className="text-xs text-gray-400">Payment currency</div>
              <div className="text-white font-medium">USD - $</div>
            </div>
            <ChevronRight size={20} className="text-gray-400 absolute right-6 top-1/2 -translate-y-1/2" />
          </button>

          {/* Theme */}
          <button className="w-full bg-dark-200 rounded-xl border border-gray-800 p-4 active:bg-dark-100 transition-colors relative">
            <div className="text-left space-y-1">
              <div className="text-xs text-gray-400">Theme</div>
              <div className="text-white font-medium">Use device settings</div>
            </div>
            <ChevronRight size={20} className="text-gray-400 absolute right-6 top-1/2 -translate-y-1/2" />
          </button>
        </div>
      </div>
    </div>
  )
}
