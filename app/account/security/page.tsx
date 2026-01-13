'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Shield, ChevronRight, UserPlus } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function SecurityPage() {
  const router = useRouter()

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
          <Shield size={24} className="text-yellow-400" />
          <h1 className="text-xl font-bold text-white flex-1">Security</h1>
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
        <div className="bg-gradient-to-br from-cyan-400 to-cyan-500 rounded-3xl overflow-hidden p-12">
          <div className="relative w-full h-48 flex items-center justify-center">
            {/* Safe illustration */}
            <div className="w-48 h-48 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl relative shadow-2xl">
              {/* Safe door */}
              <div className="absolute inset-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl border-8 border-blue-800">
                {/* Lock circle */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-yellow-400 border-4 border-yellow-500 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-yellow-500"></div>
                </div>
              </div>
              {/* Coins inside */}
              <div className="absolute bottom-2 right-2 flex gap-1">
                <div className="w-6 h-6 rounded-full bg-yellow-400"></div>
                <div className="w-6 h-6 rounded-full bg-yellow-400"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Security options Section */}
        <div className="space-y-4">
          <div>
            <h2 className="text-white text-lg font-semibold mb-1">Security options</h2>
            <p className="text-gray-400 text-sm">
              Enable two-factor authentication to keep your account safe.
            </p>
          </div>

          {/* Two-factor authentication */}
          <button className="w-full bg-dark-200 rounded-xl border border-gray-800 p-4 active:bg-dark-100 transition-colors relative">
            <div className="flex items-center gap-3">
              <Shield size={24} className="text-gray-400" />
              <span className="text-white font-medium">Two-factor authentication</span>
            </div>
            <ChevronRight size={20} className="text-gray-400 absolute right-6 top-1/2 -translate-y-1/2" />
          </button>

          {/* Merge accounts */}
          <button className="w-full bg-dark-200 rounded-xl border border-gray-800 p-4 active:bg-dark-100 transition-colors relative">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <span className="text-white font-medium">Merge accounts</span>
            </div>
            <ChevronRight size={20} className="text-gray-400 absolute right-6 top-1/2 -translate-y-1/2" />
          </button>

          {/* Report suspicious activity */}
          <button className="w-full bg-dark-200 rounded-xl border border-gray-800 p-4 active:bg-dark-100 transition-colors relative">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-white font-medium">Report suspicious activity</span>
            </div>
            <ChevronRight size={20} className="text-gray-400 absolute right-6 top-1/2 -translate-y-1/2" />
          </button>

          {/* Close account */}
          <button className="w-full bg-dark-200 rounded-xl border border-gray-800 p-4 active:bg-dark-100 transition-colors relative">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="text-white font-medium">Close account</span>
            </div>
            <ChevronRight size={20} className="text-gray-400 absolute right-6 top-1/2 -translate-y-1/2" />
          </button>
        </div>

        {/* Copilot Section */}
        <div className="space-y-4 pt-4">
          <div>
            <h2 className="text-white text-lg font-semibold mb-1">Copilot: Delegated access</h2>
            <p className="text-gray-400 text-sm">
              Allow other members to access your account.{' '}
              <span className="text-blue-400 underline">Learn more.</span>
            </p>
          </div>

          {/* Add copilot */}
          <button className="w-full bg-dark-200 rounded-xl border border-gray-800 p-4 active:bg-dark-100 transition-colors relative">
            <div className="flex items-center gap-3">
              <UserPlus size={24} className="text-gray-400" />
              <span className="text-white font-medium">Add copilot</span>
            </div>
            <ChevronRight size={20} className="text-gray-400 absolute right-6 top-1/2 -translate-y-1/2" />
          </button>
        </div>
      </div>
    </div>
  )
}
