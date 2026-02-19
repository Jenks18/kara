import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0066FF', // Bright blue - main brand color
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#0066FF',
          600: '#0052cc',
          700: '#0041a8',
          800: '#003285',
          900: '#002563',
        },
        blue: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#0066FF',
          600: '#0052cc',
          700: '#0041a8',
          800: '#003285',
          900: '#002563',
        },
        success: {
          50: '#eff6ff',
          500: '#0066FF',
          600: '#0052cc',
          700: '#0041a8',
        },
        warning: {
          50: '#fffbeb',
          500: '#f59e0b',
          600: '#d97706',
        },
        danger: {
          50: '#fef2f2',
          500: '#ef4444',
          600: '#dc2626',
        },
        dark: {
          50: '#f9fafb',
          100: '#27272a', // Neutral zinc-800 for cards/surfaces
          200: '#1f2937', // Neutral gray-800 for slightly darker surfaces
          300: '#111827', // Neutral gray-900 for main background
          400: '#0f172a', // Neutral slate-900 for darkest elements
          500: '#0c1710',
          600: '#09130d',
          700: '#060f0a',
          800: '#030b07',
          900: '#010704',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'sans-serif'],
        mono: ['SF Mono', 'Monaco', 'Consolas', 'Liberation Mono', 'monospace'],
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.05)',
        'float': '0 10px 25px -5px rgb(0 0 0 / 0.1)',
        'blue-sm': '0 4px 12px rgba(0, 102, 255, 0.15)',
        'blue-md': '0 8px 25px rgba(0, 102, 255, 0.25)',
        'blue-lg': '0 12px 35px rgba(0, 102, 255, 0.35)',
        'blue-xl': '0 20px 50px rgba(0, 102, 255, 0.4)',
      },
      backgroundImage: {
        'gradient-blue': 'linear-gradient(135deg, #0041a8 0%, #0066FF 50%, #60a5fa 100%)',
        'gradient-blue-dark': 'linear-gradient(135deg, #003285 0%, #0052cc 50%, #0066FF 100%)',
        'gradient-blue-light': 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 50%, #93c5fd 100%)',
      },
      spacing: {
        'safe': 'env(safe-area-inset-bottom)',
        'safe-top': 'env(safe-area-inset-top)',
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
export default config
