'use client'

import BottomNav from '@/components/navigation/BottomNav'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import { Briefcase, Search, Shield } from 'lucide-react'

export default function WorkspacesPage() {
  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-dark-200/95 backdrop-blur-lg border-b border-gray-800">
        <div className="px-4 py-4 max-w-md mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-100">Workspaces</h1>
            <button className="p-2 hover:bg-dark-100 rounded-full transition-colors">
              <Search size={24} className="text-gray-400" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="px-4 py-6 max-w-md mx-auto">
        {/* Empty State */}
        <EmptyState
          icon={
            <div className="relative">
              <div className="w-64 h-40 mx-auto bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto bg-primary-500/20 rounded-full flex items-center justify-center mb-3">
                    <Briefcase className="text-primary-400" size={40} />
                  </div>
                  <div className="space-y-1">
                    <div className="w-16 h-2 bg-gray-700/50 rounded mx-auto"></div>
                    <div className="w-24 h-2 bg-gray-700/50 rounded mx-auto"></div>
                  </div>
                </div>
              </div>
            </div>
          }
          title="You have no workspaces"
          description="Track receipts, reimburse expenses, manage travel, send invoices, and more."
          action={
            <Button variant="primary" size="lg" fullWidth>
              New workspace
            </Button>
          }
        />
        
        {/* Domains Section */}
        <div className="mt-12">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Domains
          </h2>
          
          <div className="bg-dark-100 rounded-2xl p-5 border border-gray-800">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                <Shield className="text-primary-400" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-100 mb-1">Enhanced security</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Require members on your domain to log in via single sign-on, restrict workspace creation, and more.
                </p>
                <Button variant="primary" size="sm">
                  Enable
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <BottomNav />
    </div>
  )
}
