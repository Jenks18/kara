'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, Shield, ChevronRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function SecurityPage() {
  const router = useRouter()

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
          <Shield size={24} className="text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900 flex-1">Security</h1>
        </div>
      </div>
      
      {/* Content */}
      <div className="px-4 py-6 max-w-md mx-auto space-y-6">

        {/* Security options Section */}
        <div className="space-y-4">
          <div>
            <h2 className="text-gray-900 text-lg font-semibold mb-1">Security options</h2>
            <p className="text-gray-600 text-sm">
              Manage your account security and report concerns.
            </p>
          </div>

          {/* Report suspicious activity */}
          <button 
            onClick={() => router.push('/account/security/suspicious-activity')}
            className="w-full bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 active:bg-gray-50 transition-colors relative shadow-sm touch-manipulation"
          >
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-gray-900 font-medium">Report suspicious activity</span>
            </div>
            <ChevronRight size={20} className="text-gray-400 absolute right-6 top-1/2 -translate-y-1/2" />
          </button>

          {/* Close account */}
          <button 
            onClick={() => router.push('/account/delete')}
            className="w-full bg-white rounded-xl border border-gray-200 p-4 hover:border-red-300 active:bg-gray-50 transition-colors relative shadow-sm touch-manipulation"
          >
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="text-gray-900 font-medium">Close account</span>
            </div>
            <ChevronRight size={20} className="text-gray-400 absolute right-6 top-1/2 -translate-y-1/2" />
          </button>
        </div>

      </div>
    </div>
  )
}
