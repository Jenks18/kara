'use client'

import { Home } from 'lucide-react'

export default function HomeClient() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white px-6 pt-12 pb-8">
        <div className="flex items-center gap-3 mb-2">
          <Home size={32} strokeWidth={2.5} />
          <h1 className="text-3xl font-bold">Home</h1>
        </div>
        <p className="text-blue-100 text-sm">Your expense tracking dashboard</p>
      </div>

      {/* Content */}
      <div className="px-6 py-6 space-y-6">
        {/* Categories Section */}
        <section className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Categories</h2>
          <p className="text-gray-600 text-sm">Expense categories will appear here</p>
        </section>

        {/* Updates Section */}
        <section className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Updates</h2>
          <p className="text-gray-600 text-sm">Recent activity and updates will appear here</p>
        </section>

        {/* Summarizations Section */}
        <section className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Summary</h2>
          <p className="text-gray-600 text-sm">Expense summaries and insights will appear here</p>
        </section>
      </div>
    </div>
  )
}
