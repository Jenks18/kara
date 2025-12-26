import React from 'react'
import Card from '../ui/Card'

interface StatsCardProps {
  title: string
  amount: number
  change?: string
  period?: string
  variant?: 'primary' | 'success' | 'warning'
}

export default function StatsCard({ 
  title, 
  amount, 
  change, 
  period = 'This Month',
  variant = 'primary' 
}: StatsCardProps) {
  const variants = {
    primary: 'from-primary-500 to-primary-600',
    success: 'from-success-500 to-success-600',
    warning: 'from-warning-500 to-warning-600',
  }
  
  return (
    <div className={`
      bg-gradient-to-br ${variants[variant]}
      rounded-2xl p-6
      text-white
      shadow-lg
    `}>
      <p className="text-sm opacity-90 font-medium">
        {period}
      </p>
      <p className="text-4xl font-bold mt-2 font-mono">
        KES {amount.toLocaleString()}
      </p>
      {change && (
        <div className="flex items-center gap-2 mt-3">
          <span className="text-xs bg-white/20 px-2 py-1 rounded-full backdrop-blur-sm">
            {change}
          </span>
        </div>
      )}
    </div>
  )
}
