import React from 'react'
import Card from '../ui/Card'
import { Fuel, MapPin, Calendar } from 'lucide-react'

interface ExpenseCardProps {
  id: string
  merchant: string
  amount: number
  date: string
  category: string
  distance?: string
  imageUrl?: string
  status?: 'pending' | 'approved' | 'rejected'
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
  onClick 
}: ExpenseCardProps) {
  const statusColors = {
    pending: 'text-warning-500',
    approved: 'text-success-500',
    rejected: 'text-danger-500',
  }
  
  return (
    <Card hoverable onClick={onClick}>
      <div className="flex items-start justify-between">
        <div className="flex gap-3 flex-1">
          {/* Icon */}
          <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center flex-shrink-0">
            <Fuel className="text-primary-400" size={24} />
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
          </div>
        </div>
        
        {/* Amount */}
        <div className="text-right flex-shrink-0 ml-3">
          <span className="font-mono font-semibold text-lg text-gray-100">
            KES {amount.toFixed(2)}
          </span>
          {status && status !== 'approved' && (
            <div className={`text-xs mt-1 ${statusColors[status]}`}>
              {status}
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
