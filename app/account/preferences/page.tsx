'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, Settings, ChevronRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function PreferencesPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="px-4 py-4 max-w-md mx-auto flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 active:scale-95 transition-transform"
          >
            <ChevronLeft size={24} className="text-gray-600" />
          </button>
          <Settings size={24} className="text-emerald-600" />
          <h1 className="text-xl font-bold text-gray-900 flex-1">Preferences</h1>
        </div>
      </div>
      
      {/* Content */}
      <div className="px-4 py-6 max-w-md mx-auto space-y-6">
        {/* App preferences Section */}
        <div className="space-y-4">
          <h2 className="text-gray-900 text-lg font-semibold">App preferences</h2>

          {/* Language */}
          <button className="w-full bg-white rounded-xl border border-gray-200 p-4 active:bg-gray-50 transition-colors relative shadow-sm">
            <div className="text-left space-y-1">
              <div className="text-xs text-gray-500">Language</div>
              <div className="text-gray-900 font-medium">English</div>
            </div>
            <ChevronRight size={20} className="text-gray-400 absolute right-6 top-1/2 -translate-y-1/2" />
          </button>

          {/* Payment currency */}
          <button className="w-full bg-white rounded-xl border border-gray-200 p-4 active:bg-gray-50 transition-colors relative shadow-sm">
            <div className="text-left space-y-1">
              <div className="text-xs text-gray-500">Payment currency</div>
              <div className="text-gray-900 font-medium">KES - KSh</div>
            </div>
            <ChevronRight size={20} className="text-gray-400 absolute right-6 top-1/2 -translate-y-1/2" />
          </button>

          {/* Theme */}
          <button className="w-full bg-white rounded-xl border border-gray-200 p-4 active:bg-gray-50 transition-colors relative shadow-sm">
            <div className="text-left space-y-1">
              <div className="text-xs text-gray-500">Theme</div>
              <div className="text-gray-900 font-medium">Light</div>
            </div>
            <ChevronRight size={20} className="text-gray-400 absolute right-6 top-1/2 -translate-y-1/2" />
          </button>
        </div>
      </div>
    </div>
  )
}
