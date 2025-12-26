import React from 'react'
import { Receipt } from 'lucide-react'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}

export default function EmptyState({ 
  icon, 
  title, 
  description, 
  action 
}: EmptyStateProps) {
  return (
    <div className="text-center py-12 px-4">
      <div className="mb-4 flex justify-center">
        {icon || <Receipt className="text-gray-600" size={64} />}
      </div>
      <h3 className="text-lg font-semibold text-gray-300 mb-2">
        {title}
      </h3>
      <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
        {description}
      </p>
      {action}
    </div>
  )
}
