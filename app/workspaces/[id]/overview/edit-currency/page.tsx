'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Search, Check } from 'lucide-react'

export const dynamic = 'force-dynamic'

const currencies = [
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
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

export default function EditCurrencyPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [workspaceId, setWorkspaceId] = useState<string>('')
  const [selectedCurrency, setSelectedCurrency] = useState<typeof currencies[0] | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    params.then(p => setWorkspaceId(p.id))
  }, [params])

  useEffect(() => {
    async function fetchWorkspace() {
      if (!workspaceId) return
      
      try {
        const response = await fetch(`/api/workspaces/${workspaceId}`)
        if (response.ok) {
          const data = await response.json()
          const currency = currencies.find(c => c.code === data.workspace.currency)
          if (currency) setSelectedCurrency(currency)
        }
      } catch (error) {
        console.error('Error fetching workspace:', error)
      }
      setLoading(false)
    }

    fetchWorkspace()
  }, [workspaceId])

  const handleSave = async () => {
    if (!selectedCurrency) return

    setSaving(true)
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          currency: selectedCurrency.code,
          currencySymbol: selectedCurrency.symbol 
        })
      })

      if (response.ok) {
        router.back()
      } else {
        alert('Failed to update currency')
      }
    } catch (error) {
      console.error('Error updating workspace:', error)
      alert('Failed to update currency')
    } finally {
      setSaving(false)
    }
  }

  const filteredCurrencies = currencies.filter(c =>
    c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

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
          <h1 className="text-xl font-bold text-gray-900 flex-1">Default currency</h1>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-4 max-w-md mx-auto w-full">
        <div className="relative">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Default currency"
            className="w-full pl-12 pr-4 py-3 border-2 border-emerald-500 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:border-emerald-600"
          />
        </div>
      </div>

      {/* Currency List */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 max-w-md mx-auto w-full">
        <div className="space-y-2">
          {filteredCurrencies.map((currency) => {
            const isSelected = selectedCurrency?.code === currency.code
            return (
              <button
                key={currency.code}
                onClick={() => setSelectedCurrency(currency)}
                className={`w-full p-4 rounded-xl border transition-all text-left ${
                  isSelected
                    ? 'bg-emerald-50 border-emerald-500'
                    : 'bg-white border-emerald-200 hover:bg-emerald-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-gray-900 font-semibold">
                      {currency.code} - {currency.symbol}
                    </div>
                    <div className="text-sm text-gray-600">{currency.name}</div>
                  </div>
                  {isSelected && <Check size={24} className="text-emerald-600" />}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Save Button */}
      <div className="sticky bottom-0 p-4 bg-gradient-to-t from-emerald-50 to-transparent">
        <button
          onClick={handleSave}
          disabled={!selectedCurrency || saving}
          className="w-full max-w-md mx-auto block py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-2xl active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}
