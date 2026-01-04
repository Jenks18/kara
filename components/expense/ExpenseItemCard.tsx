'use client'

import { AlertCircle } from 'lucide-react'
import Image from 'next/image'

interface ExpenseItemCardProps {
  imageUrl: string
  date: string
  type: string
  amount: number
  status: 'scanning' | 'review_required' | 'processed'
  userEmail: string
  onClick?: () => void
}

export default function ExpenseItemCard({
  imageUrl,
  date,
  type,
  amount,
  status,
  userEmail,
  onClick
}: ExpenseItemCardProps) {
  return (
    <div 
      onClick={onClick}
      className="bg-dark-100 rounded-2xl p-4 border border-gray-800 hover:border-gray-700 transition-colors cursor-pointer active:scale-[0.98]"
    >
      {/* User Info */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
          <span className="text-white text-xs font-bold">
            {userEmail.charAt(0).toUpperCase()}
          </span>
        </div>
        <span className="text-gray-400 text-sm">{userEmail}</span>
        <button className="ml-auto text-emerald-500 text-sm font-medium px-3 py-1 bg-emerald-500/10 rounded-full">
          View
        </button>
      </div>

      {/* Image and Details */}
      <div className="flex gap-3">
        {/* Receipt Thumbnail */}
        <div className="relative w-20 h-24 rounded-lg overflow-hidden bg-dark-200 border border-gray-700 flex-shrink-0">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt="Receipt"
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-dark-200"></div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-gray-400 text-sm">{date} • {type}</p>
            </div>
            <p className="text-white font-semibold font-mono">${amount.toFixed(2)}</p>
          </div>

          {/* Status */}
          {status === 'review_required' && (
            <div className="flex items-start gap-2 mt-2">
              <AlertCircle size={16} className="text-orange-500 flex-shrink-0 mt-0.5" />
              <p className="text-orange-500 text-sm">
                Review required. Receipt scanning failed. Enter details manually.
              </p>
            </div>
          )}

          {status === 'scanning' && (
            <div className="flex items-center gap-2 mt-2">
              <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div>
              <p className="text-gray-500 text-sm">
                Scanning...
              </p>
            </div>
          )}

          {status === 'processed' && (
            <div className="flex items-center gap-2 mt-2">
              <div className="w-1 h-1 rounded-full bg-success-500"></div>
              <p className="text-success-500 text-sm">
                Processed
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
