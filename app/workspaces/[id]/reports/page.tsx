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
    <div className="min-h-screen bg-[#121f16]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#121f16] border-b border-gray-800">
        <div className="px-4 py-4 max-w-md mx-auto flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 active:scale-95 transition-transform"
          >
            <ChevronLeft size={24} className="text-gray-400" />
          </button>
          <FileText size={24} className="text-primary" />
          <h1 className="text-xl font-bold text-white flex-1">Reports</h1>
        </div>
      </div>
      
      {/* Content */}
      <div className="px-4 py-6 max-w-md mx-auto space-y-6">
        {/* Report title section */}
        <div className="space-y-4">
          <h2 className="text-white text-lg font-semibold">Report title</h2>
          
          <div className="text-gray-400 text-sm">
            Customize report titles using our{' '}
            <span className="text-blue-400 underline">extensive formulas</span>.
          </div>

          {/* Default report title */}
          <button className="w-full bg-dark-200 rounded-xl border border-gray-800 p-4 active:bg-dark-100 transition-colors relative">
            <div className="text-left space-y-1">
              <div className="text-xs text-gray-400">Default report title</div>
              <div className="text-white font-mono text-sm">
                {'{report:type} {report:startdate}'}
              </div>
            </div>
            <ChevronLeft size={20} className="text-gray-400 absolute right-6 top-1/2 -translate-y-1/2 rotate-180" />
          </button>

          {/* Prevent members from changing custom report titles */}
          <div className="flex items-center justify-between bg-dark-200 rounded-xl border border-gray-800 p-4">
            <div className="flex-1 pr-4">
              <div className="text-white font-medium">
                Prevent members from changing custom report titles
              </div>
            </div>
            <button
              onClick={() => setPreventCustomTitles(!preventCustomTitles)}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                preventCustomTitles ? 'bg-primary' : 'bg-gray-600'
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
          <h2 className="text-white text-lg font-semibold">Report fields</h2>
          
          <div className="flex items-start justify-between bg-dark-200 rounded-xl border border-gray-800 p-4">
            <div className="flex-1 pr-4">
              <div className="text-white font-medium mb-1">Report fields</div>
              <div className="text-sm text-gray-400">
                Report fields apply to all spend and can be helpful when you'd like to prompt for extra information.
              </div>
            </div>
            <button
              onClick={() => setReportFieldsEnabled(!reportFieldsEnabled)}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors flex-shrink-0 ${
                reportFieldsEnabled ? 'bg-primary' : 'bg-gray-600'
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
