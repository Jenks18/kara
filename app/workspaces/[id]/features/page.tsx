'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Settings } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface FeatureToggle {
  id: string
  name: string
  description: string
  icon: string
  enabled: boolean
  category: 'manage' | 'spend' | 'earn' | 'integrate' | 'organize'
}

const features: FeatureToggle[] = [
  // Manage
  { id: 'workflows', name: 'Workflows', description: 'Configure how spend is approved and paid.', icon: '⚙️', enabled: true, category: 'manage' },
  { id: 'rules', name: 'Rules', description: 'Require receipts, flag high spend, and more.', icon: '📋', enabled: false, category: 'manage' },
  
  // Spend
  { id: 'distance', name: 'Distance rates', description: 'Add, update, and enforce rates.', icon: '🚗', enabled: false, category: 'spend' },
  { id: 'travel', name: 'Travel', description: 'Book, manage, and reconcile all your business travel.', icon: '🎒', enabled: false, category: 'spend' },
  { id: 'mafutapass-card', name: 'MafutaPass Card', description: 'Gain insights and control over fuel spend.', icon: '💳', enabled: false, category: 'spend' },
  { id: 'company-cards', name: 'Company cards', description: 'Connect the cards you already have.', icon: '💳', enabled: true, category: 'spend' },
  { id: 'per-diem', name: 'Per diem', description: 'Set per diem rates to control daily employee spend.', icon: '📅', enabled: false, category: 'spend' },
  
  // Earn
  { id: 'invoices', name: 'Invoices', description: 'Send and receive invoices.', icon: '📄', enabled: false, category: 'earn' },
  
  // Integrate
  { id: 'accounting', name: 'Accounting', description: 'Sync your chart of accounts and more.', icon: '📊', enabled: false, category: 'integrate' },
  { id: 'receipt-partners', name: 'Receipt partners', description: 'Automatically import receipts.', icon: '🧾', enabled: false, category: 'integrate' },
  
  // Organize
  { id: 'categories', name: 'Categories', description: 'Track and organize spend.', icon: '📁', enabled: true, category: 'organize' },
  { id: 'tags', name: 'Tags', description: 'Classify costs and track billable expenses.', icon: '🏷️', enabled: false, category: 'organize' },
  { id: 'taxes', name: 'Taxes', description: 'Document and reclaim eligible taxes.', icon: '💰', enabled: false, category: 'organize' },
]

export default function FeaturesPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [workspaceId, setWorkspaceId] = useState<string>('')
  const [featureStates, setFeatureStates] = useState<FeatureToggle[]>(features)

  useEffect(() => {
    params.then(p => setWorkspaceId(p.id))
  }, [params])

  const toggleFeature = (featureId: string) => {
    setFeatureStates(featureStates.map(f => 
      f.id === featureId ? { ...f, enabled: !f.enabled } : f
    ))
  }

  const categories = [
    { key: 'integrate', label: 'Integrate' },
    { key: 'organize', label: 'Organize' },
    { key: 'manage', label: 'Manage' },
    { key: 'spend', label: 'Spend' },
    { key: 'earn', label: 'Earn' },
  ] as const

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-emerald-200">
        <div className="px-4 py-4 max-w-md mx-auto flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 active:scale-95 transition-transform"
          >
            <ChevronLeft size={24} className="text-gray-700" />
          </button>
          <div className="flex gap-1">
            <Settings size={24} className="text-emerald-500" />
            <Settings size={24} className="text-yellow-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 flex-1">More features</h1>
        </div>
      </div>
      
      {/* Content */}
      <div className="px-4 py-6 max-w-md mx-auto space-y-8">
        {/* Description */}
        <p className="text-gray-600 text-sm">
          Use the toggles below to enable more features as you grow. Each feature will appear in the navigation menu for further customization.
        </p>

        {/* Features by Category */}
        {categories.map(({ key, label }) => {
          const categoryFeatures = featureStates.filter(f => f.category === key)
          if (categoryFeatures.length === 0) return null

          return (
            <div key={key} className="space-y-3">
              <h2 className="text-gray-600 text-sm font-semibold uppercase tracking-wider">{label}</h2>
              <div className="space-y-2">
                {categoryFeatures.map((feature) => (
                  <div
                    key={feature.id}
                    className="flex items-center gap-4 bg-white rounded-xl border border-emerald-200 p-4 shadow-sm"
                  >
                    <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 border border-emerald-200">
                      {feature.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-gray-900 font-semibold">{feature.name}</h3>
                      <p className="text-sm text-gray-600 line-clamp-1">{feature.description}</p>
                    </div>
                    <button
                      onClick={() => toggleFeature(feature.id)}
                      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors flex-shrink-0 ${
                        feature.enabled ? 'bg-emerald-600' : 'bg-gray-400'
                      }`}
                    >
                      <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                          feature.enabled ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
