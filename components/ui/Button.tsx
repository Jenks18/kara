import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  children: React.ReactNode
}

export default function Button({ 
  variant = 'primary', 
  size = 'md',
  fullWidth = false,
  children, 
  className = '',
  ...props 
}: ButtonProps) {
  const baseStyles = 'font-semibold rounded-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variants = {
    primary: 'bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white shadow-lg shadow-primary-500/20',
    secondary: 'bg-dark-100 hover:bg-dark-300 text-gray-100 border border-gray-700',
    danger: 'bg-danger-500 hover:bg-danger-600 text-white',
    ghost: 'bg-transparent hover:bg-dark-100 text-gray-300',
  }
  
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-6 py-4 text-lg',
  }
  
  return (
    <button 
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  )
}
