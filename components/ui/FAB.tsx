'use client'

import React from 'react'
import { Camera } from 'lucide-react'

interface FABProps {
  onClick?: () => void
}

export default function FAB({ onClick }: FABProps) {
  return (
    <button
      onClick={onClick}
      className="
        fixed right-4 sm:right-6
        w-14 h-14 sm:w-16 sm:h-16
        bg-primary-500 active:bg-primary-600
        text-white
        rounded-full
        shadow-2xl shadow-primary-500/40
        flex items-center justify-center
        transition-all duration-200
        active:scale-90
        touch-manipulation
        z-50
      "
      style={{
        bottom: 'calc(80px + env(safe-area-inset-bottom))'
      }}
      aria-label="Scan receipt"
    >
      <Camera size={26} className="sm:w-7 sm:h-7" />
    </button>
  )
}
