'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Camera } from 'lucide-react'

export default function NewWorkspacePage() {
  const router = useRouter()
  const [workspaceName, setWorkspaceName] = useState('')
  const [currency, setCurrency] = useState('USD - $')
  const [avatar, setAvatar] = useState('T')

  const handleConfirm = () => {
    // TODO: Save workspace to database
    console.log('Creating workspace:', { workspaceName, currency, avatar })
    router.push('/workspaces')
  }

  return (
    <div className="min-h-screen bg-dark-300 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-dark-300 border-b border-gray-800">
        <div className="px-4 py-4 max-w-md mx-auto flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 active:scale-95 transition-transform"
          >
            <ChevronLeft size={24} className="text-gray-100" />
          </button>
          <h1 className="text-xl font-semibold text-white">Confirm Workspace</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-6 max-w-md mx-auto w-full">
        {/* Description */}
        <p className="text-gray-400 mb-8">
          Track receipts, reimburse expenses, manage travel, send invoices, and more.
        </p>

        {/* Avatar */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
              <span className="text-5xl font-bold text-white">{avatar}</span>
            </div>
            <button className="absolute bottom-0 right-0 w-12 h-12 rounded-full bg-dark-100 border-4 border-dark-300 flex items-center justify-center active:scale-95 transition-transform">
              <Camera size={20} className="text-gray-300" />
            </button>
          </div>
        </div>

        {/* Workspace Name */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Workspace name
          </label>
          <input
            type="text"
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            placeholder="Terpmail's Workspace"
            className="
              w-full px-4 py-4
              bg-dark-200 
              border-2 border-emerald-500
              rounded-xl
              text-white placeholder-gray-500
              focus:outline-none focus:border-emerald-400
              transition-colors
            "
          />
        </div>

        {/* Currency Selector */}
        <button
          onClick={() => {/* TODO: Open currency picker */}}
          className="
            w-full flex items-center justify-between
            px-4 py-4
            bg-dark-200
            border border-gray-800
            rounded-xl
            transition-colors
            active:bg-dark-100
          "
        >
          <div className="text-left">
            <p className="text-sm text-gray-400 mb-1">Default currency</p>
            <p className="text-white font-medium">{currency}</p>
          </div>
          <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Confirm Button */}
      <div className="sticky bottom-0 p-4 bg-dark-300 border-t border-gray-800">
        <button
          onClick={handleConfirm}
          disabled={!workspaceName.trim()}
          className="
            w-full py-4 rounded-2xl
            bg-gradient-to-r from-emerald-500 to-emerald-600
            text-white font-semibold text-lg
            active:scale-[0.98] transition-transform
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          Confirm
        </button>
      </div>
    </div>
  )
}
