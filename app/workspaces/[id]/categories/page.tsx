'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Folder, Plus, Search } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Category {
  id: string
  name: string
  enabled: boolean
}

const defaultCategories: Category[] = [
  { id: '1', name: 'Advertising', enabled: true },
  { id: '2', name: 'Benefits', enabled: true },
  { id: '3', name: 'Car', enabled: true },
  { id: '4', name: 'Equipment', enabled: true },
  { id: '5', name: 'Fees', enabled: true },
  { id: '6', name: 'Home Office', enabled: true },
  { id: '7', name: 'Insurance', enabled: true },
  { id: '8', name: 'Meals', enabled: true },
  { id: '9', name: 'Office Supplies', enabled: true },
  { id: '10', name: 'Travel', enabled: true },
]

export default function CategoriesPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [workspaceId, setWorkspaceId] = useState<string>('')
  const [categories, setCategories] = useState<Category[]>(defaultCategories)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    params.then(p => setWorkspaceId(p.id))
  }, [params])

  const toggleCategory = (categoryId: string) => {
    setCategories(categories.map(cat => 
      cat.id === categoryId ? { ...cat, enabled: !cat.enabled } : cat
    ))
  }

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
          <Folder size={24} className="text-emerald-600" />
          <h1 className="text-xl font-bold text-gray-900 flex-1">Categories</h1>
        </div>
      </div>
      
      {/* Content */}
      <div className="px-4 py-6 max-w-md mx-auto space-y-6">
        {/* Top Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => alert('Add category functionality coming soon')}
            className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Add category
          </button>
          <button
            className="px-6 py-3 rounded-xl bg-white border border-emerald-200 text-gray-600 font-semibold active:scale-[0.98] transition-transform flex items-center gap-2 shadow-sm"
          >
            More
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Description */}
        <div className="text-gray-600 text-sm">
          Get a better overview of where money is being spent. Use our default categories or add your own.
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Find category"
            className="w-full pl-12 pr-4 py-3 bg-white border border-emerald-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:border-emerald-400 shadow-sm"
          />
        </div>

        {/* Categories table header */}
        <div className="grid grid-cols-2 gap-4 text-xs text-gray-600 px-4">
          <div>Name</div>
          <div className="text-right">Enabled</div>
        </div>

        {/* Categories List */}
        <div className="space-y-2">
          {filteredCategories.map((category) => (
            <div
              key={category.id}
              className="flex items-center justify-between bg-white rounded-xl border border-emerald-200 p-4 shadow-sm"
            >
              <button className="flex items-center gap-3 flex-1">
                <div className="text-gray-900 font-medium text-left">{category.name}</div>
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleCategory(category.id)}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                    category.enabled ? 'bg-emerald-600' : 'bg-gray-400'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      category.enabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
                <ChevronRight size={20} className="text-gray-600" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
