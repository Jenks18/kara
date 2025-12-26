import React from 'react'

interface CategoryPillProps {
  label: string
  selected?: boolean
  onClick?: () => void
  color?: string
}

export default function CategoryPill({ 
  label, 
  selected = false, 
  onClick,
  color = 'primary'
}: CategoryPillProps) {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1.5 rounded-full text-xs font-medium
        transition-all duration-200
        ${selected 
          ? `bg-${color}-500 text-white` 
          : 'bg-dark-100 text-gray-400 hover:bg-dark-300 border border-gray-700'
        }
      `}
    >
      {label}
    </button>
  )
}
