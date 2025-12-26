import React from 'react'
import { ArrowLeft } from 'lucide-react'

interface HeaderProps {
  title: string
  onBack?: () => void
  actions?: React.ReactNode
}

export default function Header({ title, onBack, actions }: HeaderProps) {
  return (
    <header className="
      sticky top-0 z-30
      bg-dark-200/95 backdrop-blur-lg border-b border-gray-800
      px-4 py-4
      safe-area-top
    ">
      <div className="flex items-center justify-between max-w-md mx-auto">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-dark-100 rounded-full transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft size={24} className="text-gray-300" />
            </button>
          )}
          <h1 className="text-xl font-bold text-gray-100">{title}</h1>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  )
}
