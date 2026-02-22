'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, Search } from 'lucide-react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase/client'
import { formatCurrency, DEFAULT_CURRENCY } from '@/lib/currency'

interface ExpenseItem {
  id: string
  merchant_name: string
  amount: number
  category: string
  transaction_date: string
  image_url: string
  processing_status: 'scanning' | 'processed' | 'needs_review' | 'error'
  kra_verified: boolean
  needs_review_fields?: string // JSON string with field review flags
}

interface ExpenseReport {
  id: string
  title: string
  total_amount: number
  status: string
  created_at: string
  items: ExpenseItem[]
}

export default function ReportDetailPage() {
  const params = useParams()
  const router = useRouter()
  const reportId = params.id as string
  
  const [report, setReport] = useState<ExpenseReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currency, setCurrency] = useState<string>(DEFAULT_CURRENCY)

  // Fetch workspace currency once
  useEffect(() => {
    supabase
      .from('workspaces')
      .select('currency')
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .then(({ data }: { data: { currency: string | null }[] | null }) => {
        if (data?.[0]?.currency) setCurrency(data[0].currency)
      })
  }, [])

  // Fetch initial data and set up real-time subscription
  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await fetch(`/api/expense-reports/${reportId}`)
        
        if (!response.ok) throw new Error('Failed to fetch report')
        
        const data = await response.json()
        setReport(data)
        setLoading(false)
      } catch (err) {
        console.error('Error fetching report:', err)
        setError(err instanceof Error ? err.message : 'Failed to load report')
        setLoading(false)
      }
    }

    fetchReport()
    
    // Set up Supabase real-time subscription for expense_items updates
    const channel = supabase
      .channel(`expense-items-${reportId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'expense_items',
          filter: `report_id=eq.${reportId}`
        },
        () => {
          fetchReport()
        }
      )
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [reportId])
  
  // Separate effect for polling to avoid dependency issues
  useEffect(() => {
    // Polling fallback: ONLY poll if there are scanning items
    const pollInterval = setInterval(async () => {
      if (report?.items?.some(item => item.processing_status === 'scanning')) {
        const response = await fetch(`/api/expense-reports/${reportId}`)
        if (response.ok) {
          const data = await response.json()
          setReport(data)
        }
      }
    }, 10000)

    return () => {
      clearInterval(pollInterval)
    }
  }, [report, reportId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-gray-600">Loading report...</div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-red-600">{error || 'Report not found'}</div>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100">
      <div className="w-full max-w-[430px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-blue-200 bg-white/80 backdrop-blur-lg">
          <button
            onClick={() => router.push('/reports')}
            className="p-2 -ml-2 active:scale-95 transition-transform"
          >
            <ChevronLeft size={24} className="text-gray-900" />
          </button>
          
          <h1 className="text-lg font-semibold text-gray-900">Report Details</h1>
          
          <button className="p-2 -mr-2 active:scale-95 transition-transform">
            <Search size={24} className="text-gray-900" />
          </button>
        </div>

        {/* Report Summary Card */}
        <div className="mx-4 mt-4 p-5 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <h2 className="text-xl font-bold text-gray-900">{report.title}</h2>
            {report.status !== 'draft' && (
              <span className={`px-3 py-1 rounded-xl text-xs font-semibold ${
                report.status === 'submitted' ? 'bg-amber-100 text-amber-700' :
                report.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                'bg-red-100 text-red-700'
              }`}>
                {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
              </span>
            )}
          </div>
          <div className="border-t border-gray-100 pt-3 flex justify-evenly text-center">
            <div>
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-lg font-bold text-blue-600 mt-0.5">{formatCurrency(report.total_amount, currency)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Items</p>
              <p className="text-lg font-bold text-gray-900 mt-0.5">{report.items.length}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Created</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">{formatDate(report.created_at)}</p>
            </div>
          </div>
        </div>

        {/* Expenses List */}
        <div className="px-4 pt-5 pb-2">
          {report.items.length > 0 && (
            <h3 className="text-base font-semibold text-gray-900 mb-3">Expenses</h3>
          )}
          <div className="space-y-3">
            {report.items.map((item) => (
              <div
                key={item.id}
                onClick={() => router.push(`/expense/${item.id}`)}
                className="bg-white rounded-2xl p-3.5 border border-gray-200 hover:border-blue-300 transition-colors cursor-pointer shadow-sm flex items-center gap-3"
              >
                {/* Receipt Thumbnail */}
                {item.image_url ? (
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    <Image src={item.image_url} alt="Receipt" fill className="object-cover" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Search size={20} className="text-blue-600" />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {item.merchant_name || 'Unknown Merchant'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700">
                      {item.category}
                    </span>
                    {item.kra_verified && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-green-50 text-green-700 flex items-center gap-0.5">
                        ✓ KRA
                      </span>
                    )}
                    {item.processing_status === 'needs_review' && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700">
                        Review
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatDate(item.transaction_date)}
                  </p>
                </div>

                {/* Amount */}
                <span className="text-sm font-bold text-blue-600 flex-shrink-0">
                  {item.amount > 0 ? formatCurrency(item.amount, currency) : 'Scanning...'}
                </span>
              </div>
            ))}
          </div>
        </div>

          {/* Empty State */}
          {report.items.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-gray-500">No expenses in this report yet</p>
            </div>
          )}
      </div>
    </div>
  )
}
