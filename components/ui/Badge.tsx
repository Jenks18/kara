import React from 'react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  className?: string
}

export default function Badge({ children, variant = 'neutral', className = '' }: BadgeProps) {
  const variants = {
    success: 'bg-success-50 text-success-700 border-success-500',
    warning: 'bg-warning-50 text-warning-700 border-warning-500',
    danger: 'bg-danger-50 text-danger-700 border-danger-500',
    info: 'bg-primary-50 text-primary-700 border-primary-500',
    neutral: 'bg-gray-100 text-gray-700 border-gray-300',
  }
  
  return (
    <span className={`
      inline-flex items-center px-2.5 py-1 rounded-full
      text-xs font-semibold border
      ${variants[variant]}
      ${className}
    `}>
      {children}
    </span>
  )
}
