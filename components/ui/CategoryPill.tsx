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
          ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md' 
          : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
        }
      `}
    >
      {label}
    </button>
  )
}
