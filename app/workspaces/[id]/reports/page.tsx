'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, FileText } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function ReportsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [workspaceId, setWorkspaceId] = useState<string>('')
  const [reportTitleEnabled, setReportTitleEnabled] = useState(false)
  const [reportFieldsEnabled, setReportFieldsEnabled] = useState(false)
  const [preventCustomTitles, setPreventCustomTitles] = useState(false)

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
          <FileText size={24} className="text-emerald-600" />
          <h1 className="text-xl font-bold text-gray-900 flex-1">Reports</h1>
        </div>
      </div>
      
      {/* Content */}
      <div className="px-4 py-6 max-w-md mx-auto space-y-6">
        {/* Report title section */}
        <div className="space-y-4">
          <h2 className="text-gray-900 text-lg font-semibold">Report title</h2>
          
          <div className="text-gray-600 text-sm">
            Customize report titles using our{' '}
            <span className="text-emerald-600 underline">extensive formulas</span>.
          </div>

          {/* Default report title */}
          <button className="w-full bg-white rounded-xl border border-emerald-200 p-4 hover:bg-emerald-50 transition-colors relative shadow-sm">
            <div className="text-left space-y-1">
              <div className="text-xs text-gray-600">Default report title</div>
              <div className="text-gray-900 font-mono text-sm">
                {'{report:type} {report:startdate}'}
              </div>
            </div>
            <ChevronLeft size={20} className="text-gray-600 absolute right-6 top-1/2 -translate-y-1/2 rotate-180" />
          </button>

          {/* Prevent members from changing custom report titles */}
          <div className="flex items-center justify-between bg-white rounded-xl border border-emerald-200 p-4 shadow-sm">
            <div className="flex-1 pr-4">
              <div className="text-gray-900 font-medium">
                Prevent members from changing custom report titles
              </div>
            </div>
            <button
              onClick={() => setPreventCustomTitles(!preventCustomTitles)}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                preventCustomTitles ? 'bg-emerald-600' : 'bg-gray-400'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  preventCustomTitles ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Report fields section */}
        <div className="space-y-4 pt-6">
          <h2 className="text-gray-900 text-lg font-semibold">Report fields</h2>
          
          <div className="flex items-start justify-between bg-white rounded-xl border border-emerald-200 p-4 shadow-sm">
            <div className="flex-1 pr-4">
              <div className="text-gray-900 font-medium mb-1">Report fields</div>
              <div className="text-sm text-gray-600">
                Report fields apply to all spend and can be helpful when you'd like to prompt for extra information.
              </div>
            </div>
            <button
              onClick={() => setReportFieldsEnabled(!reportFieldsEnabled)}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors flex-shrink-0 ${
                reportFieldsEnabled ? 'bg-emerald-600' : 'bg-gray-400'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  reportFieldsEnabled ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
