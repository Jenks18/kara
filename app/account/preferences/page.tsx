'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ChevronLeft, Settings, Sun, Moon, Monitor } from 'lucide-react'

export const dynamic = 'force-dynamic'

type ThemeMode = 'light' | 'dark' | 'system'

export default function PreferencesPage() {
  const router = useRouter()
  const [theme, setTheme] = useState<ThemeMode>('light')

  // Load saved theme on mount and apply it
  useEffect(() => {
    const saved = localStorage.getItem('kacha_theme') as ThemeMode | null
    if (saved && ['light', 'dark', 'system'].includes(saved)) {
      setTheme(saved)
      applyTheme(saved)
    } else {
      applyTheme('light')
    }
  }, [])

  // Listen for system preference changes when in system mode
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if (theme === 'system') {
        applyTheme('system')
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const applyTheme = (mode: ThemeMode) => {
    const root = document.documentElement
    if (mode === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.toggle('dark', prefersDark)
    } else {
      root.classList.toggle('dark', mode === 'dark')
    }
  }

  const handleThemeChange = (mode: ThemeMode) => {
    setTheme(mode)
    localStorage.setItem('kacha_theme', mode)
    applyTheme(mode)
  }

  const themeOptions: { mode: ThemeMode; label: string; icon: typeof Sun; description: string }[] = [
    { mode: 'light', label: 'Light', icon: Sun, description: 'Always use light mode' },
    { mode: 'dark', label: 'Dark', icon: Moon, description: 'Always use dark mode' },
    { mode: 'system', label: 'System', icon: Monitor, description: 'Follow device settings' },
  ]

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
          <div>
            <h2 className="text-gray-900 text-lg font-semibold mb-1">Theme</h2>
            <p className="text-gray-600 text-sm">
              Choose how Kacha looks on this device.
            </p>
          </div>

          <div className="space-y-2">
            {themeOptions.map(({ mode, label, icon: Icon, description }) => (
              <button
                key={mode}
                onClick={() => handleThemeChange(mode)}
                className={`w-full bg-white rounded-xl border p-4 active:bg-gray-50 transition-colors relative shadow-sm touch-manipulation flex items-center gap-3 ${
                  theme === mode ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200'
                }`}
              >
                <Icon size={24} className={theme === mode ? 'text-blue-600' : 'text-gray-400'} />
                <div className="text-left flex-1">
                  <div className={`font-medium ${theme === mode ? 'text-blue-600' : 'text-gray-900'}`}>{label}</div>
                  <div className="text-xs text-gray-500">{description}</div>
                </div>
                {theme === mode && (
                  <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
