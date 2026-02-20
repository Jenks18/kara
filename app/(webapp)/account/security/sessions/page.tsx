'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionList, useSession } from '@clerk/nextjs'
import { ChevronLeft, Monitor, Smartphone, Globe, LogOut, Loader2, ShieldCheck } from 'lucide-react'

export const dynamic = 'force-dynamic'

// Very lightweight UA parser — enough for "Mobile / Desktop" and OS hints
function parseUserAgent(ua: string | null | undefined): { device: string; os: string } {
  if (!ua) return { device: 'Unknown device', os: '' }
  const isMobile = /mobile|android|iphone|ipad/i.test(ua)
  const os = /windows/i.test(ua)   ? 'Windows'
           : /macintosh/i.test(ua) ? 'macOS'
           : /iphone/i.test(ua)    ? 'iPhone'
           : /ipad/i.test(ua)      ? 'iPad'
           : /android/i.test(ua)   ? 'Android'
           : /linux/i.test(ua)     ? 'Linux'
           : ''
  const device = isMobile ? 'Mobile' : 'Desktop'
  return { device, os }
}

function formatRelative(date: Date | null | undefined): string {
  if (!date) return 'Unknown'
  const diff = Date.now() - date.getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins  < 1)   return 'Just now'
  if (mins  < 60)  return `${mins}m ago`
  if (hours < 24)  return `${hours}h ago`
  if (days  < 30)  return `${days}d ago`
  return date.toLocaleDateString()
}

export default function ActiveSessionsPage() {
  const router = useRouter()
  const { sessions, isLoaded } = useSessionList()
  const { session: currentSession } = useSession()
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const handleRevoke = async (sessionId: string) => {
    const target = sessions?.find((s) => s.id === sessionId)
    if (!target) return
    setRevokingId(sessionId)
    try {
      await target.revoke()
    } catch {
      // session may already be inactive
    } finally {
      setRevokingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="px-4 py-4 max-w-md mx-auto flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 active:scale-95 transition-transform touch-manipulation"
          >
            <ChevronLeft size={24} className="text-gray-700" />
          </button>
          <ShieldCheck size={22} className="text-blue-600" />
          <h1 className="text-xl font-semibold text-gray-900 flex-1">Active sessions</h1>
        </div>
      </div>

      <div className="px-4 py-6 max-w-md mx-auto space-y-5 pb-24">
        <div>
          <p className="text-sm text-gray-600">
            These are the devices currently signed in to your account. Revoke any session
            you don't recognise immediately.
          </p>
        </div>

        {!isLoaded ? (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-3">
            {(sessions ?? [])
              .filter((s) => s.status === 'active')
              .sort((a, b) => {
                // Current session first
                if (a.id === currentSession?.id) return -1
                if (b.id === currentSession?.id) return  1
                return (b.lastActiveAt?.getTime() ?? 0) - (a.lastActiveAt?.getTime() ?? 0)
              })
              .map((session) => {
                const isCurrent = session.id === currentSession?.id
                const { device, os } = parseUserAgent(
                  (session as any).latestActivity?.browserName
                    ? `${(session as any).latestActivity.browserName} ${os}`
                    : undefined
                )
                const DeviceIcon = isCurrent || device === 'Desktop' ? Monitor : Smartphone
                const city    = (session as any).latestActivity?.city
                const country = (session as any).latestActivity?.country
                const location = [city, country].filter(Boolean).join(', ')

                return (
                  <div
                    key={session.id}
                    className={`bg-white rounded-xl border shadow-sm p-4 ${isCurrent ? 'border-blue-300 ring-1 ring-blue-200' : 'border-gray-200'}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl ${isCurrent ? 'bg-blue-50' : 'bg-gray-50'}`}>
                        <DeviceIcon size={22} className={isCurrent ? 'text-blue-600' : 'text-gray-500'} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-900">
                            {os || device || 'Unknown device'}
                          </span>
                          {isCurrent && (
                            <span className="text-xs bg-blue-100 text-blue-700 font-medium px-2 py-0.5 rounded-full">
                              This device
                            </span>
                          )}
                        </div>
                        <div className="mt-1 space-y-0.5">
                          {location && (
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Globe size={11} />
                              {location}
                            </p>
                          )}
                          <p className="text-xs text-gray-400">
                            Last active {formatRelative(session.lastActiveAt)}
                          </p>
                        </div>
                      </div>

                      {!isCurrent && (
                        <button
                          onClick={() => handleRevoke(session.id)}
                          disabled={revokingId === session.id}
                          className="flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors touch-manipulation disabled:opacity-50"
                          title="Revoke session"
                        >
                          {revokingId === session.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <LogOut size={13} />
                          )}
                          Revoke
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        )}

        {isLoaded && (sessions ?? []).filter((s) => s.status === 'active').length === 0 && (
          <p className="text-center text-sm text-gray-500 py-12">No active sessions found.</p>
        )}
      </div>
    </div>
  )
}
