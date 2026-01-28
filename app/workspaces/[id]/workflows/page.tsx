'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { ChevronLeft, ChevronRight, GitBranch, Users, Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function WorkflowsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { user } = useUser()
  const [workspaceId, setWorkspaceId] = useState<string>('')
  const [submissionsEnabled, setSubmissionsEnabled] = useState(true)
  const [approvalsEnabled, setApprovalsEnabled] = useState(true)
  const [paymentsEnabled, setPaymentsEnabled] = useState(true)

  useEffect(() => {
    params.then(p => setWorkspaceId(p.id))
  }, [params])

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
          <GitBranch size={24} className="text-emerald-600" />
          <h1 className="text-xl font-bold text-gray-900 flex-1">Workflows</h1>
        </div>
      </div>
      
      {/* Content */}
      <div className="px-4 py-6 max-w-md mx-auto space-y-6">
        {/* Submissions Section */}
        <div className="space-y-4">
          <h2 className="text-gray-900 text-lg font-semibold">Submissions</h2>
          
          <div className="flex items-start justify-between bg-white rounded-xl border border-emerald-200 p-4 shadow-sm">
            <div className="flex-1 pr-4">
              <div className="text-gray-900 font-medium mb-1">
                Choose a custom schedule for submitting expenses.
              </div>
            </div>
            <button
              onClick={() => setSubmissionsEnabled(!submissionsEnabled)}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors flex-shrink-0 ${
                submissionsEnabled ? 'bg-emerald-600' : 'bg-gray-400'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  submissionsEnabled ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <button className="w-full bg-white rounded-xl border border-emerald-200 p-4 active:bg-emerald-50 transition-colors relative shadow-sm">
            <div className="text-left space-y-1">
              <div className="text-xs text-gray-500">Frequency</div>
              <div className="text-gray-900 font-medium">Manually</div>
            </div>
            <ChevronRight size={20} className="text-gray-600 absolute right-6 top-1/2 -translate-y-1/2" />
          </button>
        </div>

        {/* Approvals Section */}
        <div className="space-y-4 pt-4">
          <h2 className="text-gray-900 text-lg font-semibold">Approvals</h2>
          
          <div className="flex items-start justify-between bg-white rounded-xl border border-emerald-200 p-4 shadow-sm">
            <div className="flex-1 pr-4">
              <div className="text-gray-900 font-medium mb-1">
                Require additional approval before authorizing a payment.
              </div>
            </div>
            <button
              onClick={() => setApprovalsEnabled(!approvalsEnabled)}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors flex-shrink-0 ${
                approvalsEnabled ? 'bg-emerald-600' : 'bg-gray-400'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  approvalsEnabled ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Default workflow card */}
          <div className="bg-white rounded-xl border border-emerald-200 p-4 space-y-3 shadow-sm">
            <div className="flex items-start gap-2 text-gray-600 text-sm">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>This default workflow applies to all members, unless a more specific workflow exists.</span>
            </div>

            <button className="w-full bg-emerald-50 rounded-lg border border-emerald-200 p-3 active:bg-emerald-100 transition-colors relative">
              <div className="flex items-center gap-3">
                <Users size={20} className="text-emerald-600" />
                <div className="text-left flex-1">
                  <div className="text-xs text-gray-500">Expenses from</div>
                  <div className="text-gray-900 font-medium">Everyone</div>
                </div>
                <ChevronRight size={20} className="text-gray-600" />
              </div>
            </button>

            <button className="w-full bg-emerald-50 rounded-lg border border-emerald-200 p-3 active:bg-emerald-100 transition-colors relative">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <div className="text-left flex-1">
                  <div className="text-xs text-gray-500">Approver</div>
                  <div className="text-gray-900 font-medium">{user?.emailAddresses[0]?.emailAddress || 'Owner'}</div>
                </div>
                <ChevronRight size={20} className="text-gray-600" />
              </div>
            </button>
          </div>

          <button className="w-full py-3 rounded-xl bg-dark-200 border border-gray-800 text-gray-400 font-medium active:scale-[0.98] transition-transform flex items-center justify-center gap-2">
            <Plus size={20} />
            Add approval workflow
          </button>
        </div>

        {/* Payments Section */}
        <div className="space-y-4 pt-4">
          <h2 className="text-gray-900 text-lg font-semibold">Payments</h2>
          
          <div className="flex items-start justify-between bg-white rounded-xl border border-emerald-200 p-4 shadow-sm">
            <div className="flex-1 pr-4">
              <div className="text-gray-900 font-medium mb-1">
                Add an authorized payer for payments made in MafutaPass or track payments made elsewhere.
              </div>
            </div>
            <button
              onClick={() => setPaymentsEnabled(!paymentsEnabled)}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors flex-shrink-0 ${
                paymentsEnabled ? 'bg-emerald-600' : 'bg-gray-400'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  paymentsEnabled ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <button className="w-full py-3 rounded-xl bg-white border border-emerald-200 text-gray-600 font-medium active:scale-[0.98] transition-transform flex items-center justify-center gap-2 shadow-sm">
            <Plus size={20} />
            Add bank account
          </button>
        </div>
      </div>
    </div>
  )
}
