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
        fixed bottom-24 right-6
        w-16 h-16
        bg-primary-500 hover:bg-primary-600
        text-white
        rounded-full
        shadow-2xl shadow-primary-500/40
        flex items-center justify-center
        transition-all duration-300
        active:scale-90
        z-50
      "
      aria-label="Scan receipt"
    >
      <Camera size={28} />
    </button>
  )
}
