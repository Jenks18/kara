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
        bg-dark-100 rounded-2xl p-5 border border-gray-800
        ${hoverable ? 'transition-all duration-200 active:bg-dark-300 active:scale-[0.98] cursor-pointer touch-manipulation' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
