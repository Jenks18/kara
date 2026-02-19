'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, Info, ChevronRight, Bug } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function AboutPage() {
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
          <Info size={24} className="text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900 flex-1">About</h1>
        </div>
      </div>
      
      {/* Content */}
      <div className="px-4 py-6 max-w-md mx-auto space-y-6">
        {/* Version */}
        <div className="text-center text-gray-500 text-sm">
          v1.0.0
        </div>

        {/* About Kacha */}
        <div className="space-y-4 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-gray-900 text-lg font-semibold">About Kacha</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Kacha — derived from the Swahili word for &ldquo;capture&rdquo; — is a modern receipt management and expense tracking platform built for individuals and teams.
          </p>
          <p className="text-gray-600 text-sm leading-relaxed">
            Photograph any receipt, and structured data is extracted automatically. Organise expenses, generate detailed reports, and collaborate with your team through shared workspaces — all from a single application.
          </p>
          <p className="text-gray-600 text-sm leading-relaxed">
            Designed with simplicity and reliability in mind, Kacha streamlines financial record-keeping so you can focus on what matters most.
          </p>
        </div>

        {/* Links */}
        <div className="space-y-2">
          {/* Report a bug */}
          <button
            onClick={() => router.push('/account/about/report-bug')}
            className="w-full bg-white rounded-xl border border-gray-200 p-4 active:bg-gray-50 transition-colors relative shadow-sm touch-manipulation"
          >
            <div className="flex items-center gap-3">
              <Bug size={24} className="text-blue-600" />
              <span className="text-gray-900 font-medium">Report a bug</span>
            </div>
            <ChevronRight size={20} className="text-gray-400 absolute right-6 top-1/2 -translate-y-1/2" />
          </button>
        </div>

        {/* Terms & Privacy */}
        {/* TODO: Rewrite Terms of Service and Privacy Policy content */}
        <div className="text-center text-gray-500 text-sm pt-4">
          Read the <span className="text-blue-600 underline">Terms of Service</span> and <span className="text-blue-600 underline">Privacy Policy</span>.
        </div>

        {/* Support email */}
        <div className="text-center text-gray-500 text-sm">
          Questions? Contact <a href="mailto:masomonews19@gmail.com" className="text-blue-600 hover:underline">masomonews19@gmail.com</a>
        </div>
      </div>
    </div>
  )
}
