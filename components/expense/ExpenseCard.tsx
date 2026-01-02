import React from 'react'
import Card from '../ui/Card'
import { Fuel, MapPin, Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react'

interface ExpenseCardProps {
  id: string
  merchant: string
  amount: number
  date: string
  category: string
  distance?: string
  imageUrl?: string
  status?: 'pending' | 'approved' | 'rejected' | 'processing' | 'needs_review'
  litres?: number
  pricePerLitre?: number
  onClick?: () => void
}

export default function ExpenseCard({ 
  merchant, 
  amount, 
  date, 
  category, 
  distance,
  imageUrl,
  status = 'approved',
  litres,
  pricePerLitre,
  onClick 
}: ExpenseCardProps) {
  const statusConfig = {
    pending: { color: 'text-warning-500', icon: Clock, label: 'Pending' },
    approved: { color: 'text-success-500', icon: CheckCircle, label: 'Approved' },
    rejected: { color: 'text-danger-500', icon: AlertCircle, label: 'Rejected' },
    processing: { color: 'text-primary-400', icon: Clock, label: 'Processing...' },
    needs_review: { color: 'text-warning-500', icon: AlertCircle, label: 'Needs Review' },
  }
  
  const config = statusConfig[status]
  const StatusIcon = config.icon
  
  return (
    <Card hoverable onClick={onClick} className={status === 'processing' ? 'opacity-75' : ''}>
      <div className="flex items-start justify-between">
        <div className="flex gap-3 flex-1">
          {/* Icon */}
          <div className={`
            w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
            ${status === 'processing' ? 'bg-primary-500/10' : 'bg-primary-500/10'}
          `}>
            {status === 'processing' ? (
              <div className="w-6 h-6 border-3 border-primary-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Fuel className="text-primary-400" size={24} />
            )}
          </div>
          
          {/* Details */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-100 truncate">
              {merchant}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
              <span>{category}</span>
              <span>•</span>
              <span>{date}</span>
            </div>
            {distance && (
              <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                <MapPin size={12} />
                <span>{distance}</span>
              </div>
            )}
            {litres && pricePerLitre && (
              <div className="flex items-center gap-2 mt-2 text-xs">
                <span className="text-gray-400">{litres}L</span>
                <span className="text-gray-600">•</span>
                <span className="text-gray-400">KES {pricePerLitre.toFixed(2)}/L</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Amount & Status */}
        <div className="text-right flex-shrink-0 ml-3">
          <span className="font-mono font-semibold text-lg text-gray-100 block">
            KES {amount.toFixed(2)}
          </span>
          {status && (status !== 'approved' || litres) && (
            <div className={`flex items-center gap-1 justify-end mt-1 text-xs ${config.color}`}>
              <StatusIcon size={12} />
              <span>{config.label}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Receipt Thumbnail */}
      {imageUrl && (
        <div className="mt-3 pt-3 border-t border-gray-800">
          <img 
            src={imageUrl} 
            className="w-full h-32 object-cover rounded-lg"
            alt="Receipt"
          />
        </div>
      )}
    </Card>
  )
}
