'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, Info, ChevronRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function AboutPage() {
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
          <Info size={24} className="text-emerald-600" />
          <h1 className="text-xl font-bold text-gray-900 flex-1">About</h1>
        </div>
      </div>
      
      {/* Content */}
      <div className="px-4 py-6 max-w-md mx-auto space-y-6">
        {/* Version */}
        <div className="text-center text-gray-500 text-sm">
          v1.0.0
        </div>

        {/* About MafutaPass */}
        <div className="space-y-4 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-gray-900 text-lg font-semibold">About MafutaPass</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            MafutaPass is a fuel expense tracking app built for Kenyan businesses and drivers. Track your fuel expenses, receipts, and mileage all in one place.
          </p>
        </div>

        {/* Links */}
        <div className="space-y-2">
          {/* App download links */}
          <button className="w-full bg-white rounded-xl border border-gray-200 p-4 active:bg-gray-50 transition-colors relative shadow-sm">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span className="text-gray-900 font-medium">App download links</span>
            </div>
            <ChevronRight size={20} className="text-gray-400 absolute right-6 top-1/2 -translate-y-1/2" />
          </button>

          {/* View keyboard shortcuts */}
          <button className="w-full bg-white rounded-xl border border-gray-200 p-4 active:bg-gray-50 transition-colors relative shadow-sm">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              <span className="text-gray-900 font-medium">Keyboard shortcuts</span>
            </div>
            <ChevronRight size={20} className="text-gray-400 absolute right-6 top-1/2 -translate-y-1/2" />
          </button>

          {/* View open jobs */}
          <button className="w-full bg-white rounded-xl border border-gray-200 p-4 active:bg-gray-50 transition-colors relative shadow-sm">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-gray-900 font-medium">View open jobs</span>
            </div>
            <svg className="w-5 h-5 text-gray-400 absolute right-6 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>

          {/* Report a bug */}
          <button className="w-full bg-white rounded-xl border border-gray-200 p-4 active:bg-gray-50 transition-colors relative shadow-sm">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-gray-900 font-medium">Report a bug</span>
            </div>
            <ChevronRight size={20} className="text-gray-400 absolute right-6 top-1/2 -translate-y-1/2" />
          </button>
        </div>

        {/* Terms & Privacy */}
        <div className="text-center text-gray-500 text-sm pt-4">
          Read the <span className="text-emerald-600 underline">Terms of Service</span> and <span className="text-emerald-600 underline">Privacy</span>.
        </div>
      </div>
    </div>
  )
}
