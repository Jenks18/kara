import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  hoverable?: boolean
}

export default function Card({ children, className = '', onClick, hoverable = false }: CardProps) {
  return (
    <div 
      className={`
        bg-white rounded-2xl p-5 border border-gray-200 shadow-sm
        ${hoverable ? 'transition-all duration-200 hover:border-emerald-300 active:bg-gray-50 active:scale-[0.98] cursor-pointer touch-manipulation' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
