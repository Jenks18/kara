'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, CreditCard, Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function CompanyCardsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [workspaceId, setWorkspaceId] = useState<string>('')

  useEffect(() => {
    params.then(p => setWorkspaceId(p.id))
  }, [params])

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
          <CreditCard size={24} className="text-primary" />
          <h1 className="text-xl font-bold text-white flex-1">Company cards</h1>
        </div>
      </div>
      
      {/* Content */}
      <div className="px-4 py-6 max-w-md mx-auto space-y-6">
        {/* Expensify Card Promotion */}
        <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-800/40 rounded-3xl border border-emerald-700/30 p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center flex-shrink-0">
              <CreditCard size={32} className="text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-white text-xl font-bold mb-2">Get the Expensify Card</h2>
            </div>
          </div>
          
          <p className="text-gray-300 text-sm leading-relaxed">
            Enjoy cash back on every US purchase, up to 50% off your Expensify bill, unlimited virtual cards, and so much more.
          </p>

          <button className="w-full py-3 rounded-xl bg-primary text-white font-semibold active:scale-[0.98] transition-transform">
            Learn more
          </button>
        </div>

        {/* BYOC Section */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/40 rounded-3xl border border-blue-700/30 p-8">
            <div className="flex justify-center mb-4">
              <div className="relative w-48 h-32">
                {/* Card illustration */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-24 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl shadow-2xl transform rotate-6">
                    <div className="p-4 flex flex-col justify-between h-full">
                      <div className="flex justify-between items-start">
                        <div className="w-8 h-6 bg-yellow-400 rounded"></div>
                      </div>
                      <div className="space-y-1">
                        <div className="w-24 h-1.5 bg-white/40 rounded"></div>
                        <div className="w-16 h-1.5 bg-white/40 rounded"></div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-4 -left-4 w-16 h-16 bg-red-500 rounded-xl shadow-xl transform -rotate-12 flex items-center justify-center">
                    <span className="text-2xl">💳</span>
                  </div>
                  <div className="absolute bottom-0 right-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <h2 className="text-white text-2xl font-bold">
            Bring your own cards (BYOC)
          </h2>

          <p className="text-gray-400">
            Link the cards you already have for automatic transaction import, receipt matching, and reconciliation.
          </p>

          {/* Features list */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-dark-200 rounded-xl border border-gray-800">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <CreditCard size={20} className="text-white" />
              </div>
              <span className="text-white">Connect cards from 10,000+ banks</span>
            </div>

            <div className="flex items-center gap-3 p-3 bg-dark-200 rounded-xl border border-gray-800">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <span className="text-white">Link your team's existing cards</span>
            </div>

            <div className="flex items-center gap-3 p-3 bg-dark-200 rounded-xl border border-gray-800">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <span className="text-white">We'll pull in transactions automatically</span>
            </div>
          </div>

          {/* Add cards button */}
          <button className="w-full py-4 rounded-xl bg-primary text-white font-semibold text-lg active:scale-[0.98] transition-transform flex items-center justify-center gap-2 mt-6">
            Add cards
          </button>
        </div>
      </div>
    </div>
  )
}
