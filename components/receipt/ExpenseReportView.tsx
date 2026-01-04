'use client'

import { useState } from 'react'
import { ChevronLeft, Search, ChevronDown, Send, Plus, Smile } from 'lucide-react'
import Image from 'next/image'

interface ExpenseReportViewProps {
  images: string[]
  workspace: string
  reportId?: string
  onBack: () => void
}

export default function ExpenseReportView({ images, workspace, reportId, onBack }: ExpenseReportViewProps) {
  const [message, setMessage] = useState('')
  const currentDate = new Date().toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  })
  const reportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })

  return (
    <div className="fixed inset-0 bg-dark-300 z-50 flex flex-col">
      <div className="w-full max-w-[430px] h-full mx-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <button
            onClick={onBack}
            className="p-2 -ml-2 active:scale-95 transition-transform"
          >
            <ChevronLeft size={24} className="text-gray-300" />
          </button>
          
          <div className="flex-1 flex items-center justify-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-emerald-md">
              <span className="text-white font-bold text-lg">T</span>
              <div className="absolute bottom-0 right-0 w-4 h-4 bg-amber-500 rounded-full border-2 border-dark-300"></div>
            </div>
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-1">
                <span className="text-white font-medium">injenga's expenses</span>
                <ChevronDown size={16} className="text-gray-400" />
              </div>
              <span className="text-xs text-gray-400">Terpmail's Workspace</span>
            </div>
          </div>

          <button className="p-2 -mr-2 active:scale-95 transition-transform">
            <Search size={22} className="text-gray-300" />
          </button>
        </div>

        {/* Welcome Message */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome to Terpmail's Workspace!
            </h1>
            <p className="text-gray-400 text-sm">
              This is where <span className="text-white">injenga@terpmail.umd.edu</span> will
              submit expenses to <span className="text-white">Terpmail's Workspace</span>. Just
              use the + button.
            </p>
          </div>

          {/* User Avatar and Name */}
          <div className="flex items-start gap-3 mb-6">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">👤</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center shadow-emerald-sm">
                <span className="text-white font-bold text-xs">T</span>
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white font-medium text-sm">injenga@terpmail.umd.edu</span>
                <span className="text-xs text-gray-500">Today at {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
              </div>

              {/* Expense Report Card */}
              <div className="bg-dark-200 rounded-2xl overflow-hidden border border-gray-700">
                {/* Report Header */}
                <div className="p-4 border-b border-gray-700">
                  <h3 className="text-white font-semibold text-lg mb-2">
                    Expense Report {reportDate}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-full">
                      Draft
                    </span>
                    <span className="text-gray-400 text-sm">
                      {images.length} expense{images.length > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Receipt Images - Horizontal Scroll */}
                <div className="p-4">
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {images.map((image, index) => (
                      <div key={index} className="flex-shrink-0 w-32">
                        <div className="relative w-32 h-40 rounded-xl overflow-hidden bg-dark-100 border border-gray-700">
                          <Image
                            src={image}
                            alt={`Receipt ${index + 1}`}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="mt-2">
                          <p className="text-xs text-gray-400 text-center">{currentDate} • Cash</p>
                          <p className="text-xs text-gray-400 mt-1 text-center font-mono">$0.00</p>
                          <div className="mt-1 flex items-center justify-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                            <p className="text-xs text-orange-500">Review required</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total and View Button */}
                <div className="p-4 border-t border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-gray-400 text-sm">Total</span>
                    <span className="text-white text-xl font-bold font-mono">$0.00</span>
                  </div>
                  <button className="w-full bg-dark-100 hover:bg-dark-100/80 active:scale-[0.98] text-white font-medium py-3 rounded-full transition-all duration-200 border border-gray-600">
                    View
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center gap-2 bg-dark-200 rounded-full px-4 py-3 border border-gray-600">
            <button className="p-1 active:scale-95 transition-transform">
              <Plus size={20} className="text-emerald-500" />
            </button>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write something..."
              className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none"
            />
            <button className="p-1 active:scale-95 transition-transform">
              <Smile size={20} className="text-gray-400" />
            </button>
            <button className="p-1 active:scale-95 transition-transform">
              <Send size={20} className="text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}
