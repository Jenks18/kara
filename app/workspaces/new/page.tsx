'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { ChevronLeft, Camera, Search, X } from 'lucide-react'

// Force dynamic rendering to avoid Clerk prerender issues
export const dynamic = 'force-dynamic'

const currencies = [
  { code: 'KSH', symbol: 'KSh', name: 'Kenyan Shilling' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'GHS', symbol: '₵', name: 'Ghanaian Cedi' },
  { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling' },
  { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling' },
]

export default function NewWorkspacePage() {
  const router = useRouter()
  const { user } = useUser()
  const [workspaceName, setWorkspaceName] = useState('')
  const [currency, setCurrency] = useState('KSH - KSh')
  const [avatar, setAvatar] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false)
  const [currencySearch, setCurrencySearch] = useState('')

  // Set default avatar to first letter of workspace name
  const displayAvatar = avatar || workspaceName.charAt(0).toUpperCase() || 'W'

  const handleConfirm = async () => {
    if (!workspaceName.trim()) return

    setIsCreating(true)
    try {
      const [currencyCode, symbol] = currency.split(' - ')
      
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: workspaceName.trim(),
          avatar: displayAvatar,
          currency: currencyCode,
          currencySymbol: symbol,
        })
      })

      const result = await response.json()

      if (response.ok) {
        router.push('/workspaces')
      } else {
        alert(`Failed to create workspace: ${result.error}`)
      }
    } catch (error) {
      console.error('Error creating workspace:', error)
      alert('Failed to create workspace')
    } finally {
      setIsCreating(false)
    }
  }

  const handleCurrencySelect = (currencyCode: string, symbol: string) => {
    setCurrency(`${currencyCode} - ${symbol}`)
    setShowCurrencyPicker(false)
    setCurrencySearch('')
  }

  const filteredCurrencies = currencies.filter(c =>
    c.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
    c.name.toLowerCase().includes(currencySearch.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-emerald-200">
        <div className="px-4 py-4 max-w-md mx-auto flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 active:scale-95 transition-transform"
          >
            <ChevronLeft size={24} className="text-gray-700" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900">Confirm Workspace</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-6 max-w-md mx-auto w-full">
        {/* Description */}
        <p className="text-gray-600 mb-8">
          Track receipts, reimburse expenses, manage travel, send invoices, and more.
        </p>

        {/* Avatar */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center">
              <span className="text-5xl font-bold text-white">{displayAvatar}</span>
            </div>
            <button className="absolute bottom-0 right-0 w-12 h-12 rounded-full bg-white border-4 border-emerald-100 flex items-center justify-center active:scale-95 transition-transform shadow-sm">
              <Camera size={20} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Workspace Name */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-600 mb-2">
            Workspace name
          </label>
          <input
            type="text"
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            placeholder="Terpmail's Workspace"
            className="
              w-full px-4 py-4
              bg-white
              border-2 border-emerald-500
              rounded-xl
              text-gray-900 placeholder-gray-500
              focus:outline-none focus:border-emerald-400
              transition-colors shadow-sm
            "
          />
        </div>

        {/* Currency Selector */}
        <button
          onClick={() => setShowCurrencyPicker(true)}
          className="
            w-full flex items-center justify-between
            px-4 py-4
            bg-white
            border border-emerald-200
            rounded-xl
            transition-colors
            hover:bg-emerald-50 shadow-sm
          "
        >
          <div className="text-left">
            <p className="text-sm text-gray-600 mb-1">Default currency</p>
            <p className="text-gray-900 font-medium">{currency}</p>
          </div>
          <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Confirm Button */}
      <div className="sticky bottom-0 p-4 bg-white border-t border-emerald-200">
        <button
          onClick={handleConfirm}
          disabled={!workspaceName.trim() || isCreating}
          className="
            w-full py-4 rounded-2xl
            bg-gradient-to-r from-emerald-500 to-emerald-600
            text-white font-semibold text-lg
            active:scale-[0.98] transition-transform
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {isCreating ? 'Creating...' : 'Confirm'}
        </button>
      </div>

      {/* Currency Picker Modal */}
      {showCurrencyPicker && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-emerald-200">
              <h2 className="text-xl font-bold text-gray-900">Select Currency</h2>
              <button
                onClick={() => {
                  setShowCurrencyPicker(false)
                  setCurrencySearch('')
                }}
                className="p-2 active:scale-95 transition-transform"
              >
                <X size={24} className="text-gray-600" />
              </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-emerald-200">
              <div className="relative">
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                <input
                  type="text"
                  value={currencySearch}
                  onChange={(e) => setCurrencySearch(e.target.value)}
                  placeholder="Search currency..."
                  className="w-full pl-12 pr-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            {/* Currency List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredCurrencies.map((curr) => {
                const isSelected = currency.startsWith(curr.code)
                return (
                  <button
                    key={curr.code}
                    onClick={() => handleCurrencySelect(curr.code, curr.symbol)}
                    className={`w-full p-4 rounded-xl border transition-colors text-left ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-500'
                        : 'bg-white border-emerald-200 hover:bg-emerald-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-gray-900 font-semibold">{curr.code} - {curr.symbol}</div>
                        <div className="text-sm text-gray-600">{curr.name}</div>
                      </div>
                      {isSelected && (
                        <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
