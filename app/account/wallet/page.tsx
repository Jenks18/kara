'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Wallet as WalletIcon, Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function WalletPage() {
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
          <WalletIcon size={24} className="text-primary" />
          <h1 className="text-xl font-bold text-white flex-1">Wallet</h1>
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
        <div className="bg-gradient-to-br from-amber-700 to-amber-800 rounded-3xl overflow-hidden p-12">
          <div className="relative w-full h-48 flex items-center justify-center">
            {/* Safe/Vault illustration */}
            <div className="w-56 h-44 bg-gradient-to-br from-yellow-600 to-yellow-700 rounded-3xl shadow-2xl relative border-8 border-yellow-800">
              {/* Left door closed */}
              <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-l-2xl border-r-4 border-yellow-700"></div>
              {/* Right door open */}
              <div className="absolute right-0 top-0 bottom-0 w-28 bg-gradient-to-br from-blue-600 to-blue-700 rounded-r-2xl border-l-4 border-blue-800 overflow-hidden">
                {/* Inside view with coins */}
                <div className="absolute inset-2 flex items-center justify-center">
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-1">
                      <div className="w-6 h-6 rounded-full bg-yellow-400 border-2 border-yellow-500"></div>
                      <div className="w-6 h-6 rounded-full bg-yellow-400 border-2 border-yellow-500"></div>
                    </div>
                    <div className="flex gap-1">
                      <div className="w-6 h-6 rounded-full bg-yellow-400 border-2 border-yellow-500"></div>
                      <div className="w-6 h-6 rounded-full bg-yellow-400 border-2 border-yellow-500"></div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Lock wheel */}
              <div className="absolute top-1/2 left-8 -translate-y-1/2 w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 border-4 border-yellow-600"></div>
            </div>
          </div>
        </div>

        {/* Bank accounts Section */}
        <div className="space-y-4">
          <div>
            <h2 className="text-white text-lg font-semibold mb-1">Bank accounts</h2>
            <p className="text-gray-400 text-sm">
              Add a bank account to make or receive payments.
            </p>
          </div>

          {/* Add bank account */}
          <button className="w-full bg-dark-200 rounded-xl border border-gray-800 p-4 active:bg-dark-100 transition-colors">
            <div className="flex items-center gap-3">
              <Plus size={24} className="text-gray-400" />
              <span className="text-white font-medium">Add bank account</span>
            </div>
          </button>
        </div>

        {/* MafutaPass Wallet Section */}
        <div className="space-y-4 pt-4">
          <div>
            <h2 className="text-white text-lg font-semibold mb-1">MafutaPass Wallet (Beta)</h2>
            <p className="text-gray-400 text-sm">
              Send and receive money with friends. Kenyan bank accounts only.
            </p>
          </div>

          {/* Enable wallet */}
          <button className="w-full bg-dark-200 rounded-xl border border-gray-800 p-4 active:bg-dark-100 transition-colors">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-white font-medium">Enable wallet</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
