'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ChevronLeft, Settings, ChevronRight, Palette } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function PreferencesPage() {
  const router = useRouter()
  const [currentTheme, setCurrentTheme] = useState('Light')

  useEffect(() => {
    const saved = localStorage.getItem('kacha_theme')
    if (saved) {
      setCurrentTheme(saved.charAt(0).toUpperCase() + saved.slice(1))
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="px-4 py-4 max-w-md mx-auto flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 active:scale-95 transition-transform touch-manipulation"
          >
            <ChevronLeft size={24} className="text-gray-600" />
          </button>
          <Settings size={24} className="text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900 flex-1">Preferences</h1>
        </div>
      </div>
      
      {/* Content */}
      <div className="px-4 py-6 max-w-md mx-auto space-y-6">
        <div className="space-y-4">
          <h2 className="text-gray-900 text-lg font-semibold">App preferences</h2>

          {/* Theme */}
          <button
            onClick={() => router.push('/account/preferences/theme')}
            className="w-full bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 active:bg-gray-50 transition-colors relative shadow-sm touch-manipulation"
          >
            <div className="flex items-center gap-3">
              <Palette className="w-6 h-6 text-blue-600" />
              <div className="text-left flex-1">
                <p className="text-xs text-gray-500">Theme</p>
                <p className="text-gray-900 font-medium">{currentTheme}</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-400 absolute right-4 top-1/2 -translate-y-1/2" />
          </button>
        </div>
      </div>
    </div>
  )
}
