'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, Search } from 'lucide-react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase/client'

interface ExpenseItem {
  id: string
  merchant_name: string
  amount: number
  category: string
  transaction_date: string
  image_url: string
  processing_status: 'scanning' | 'processed' | 'failed'
  kra_verified: boolean
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
          event: 'UPDATE',
          schema: 'public',
          table: 'expense_items',
          filter: `report_id=eq.${reportId}`
        },
        () => {
          fetchReport()
        }
      )
      .subscribe()
    
    // Polling fallback: check every 5 seconds if any items are scanning
    const pollInterval = setInterval(async () => {
      const currentReport = await fetch(`/api/expense-reports/${reportId}`).then(r => r.json()).catch(() => null)
      if (currentReport?.items?.some((item: ExpenseItem) => item.processing_status === 'scanning')) {
        fetchReport()
      }
    }, 5000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(pollInterval)
    }
  }, [reportId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-gray-600">Loading report...</div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-red-600">{error || 'Report not found'}</div>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100">
      <div className="w-full max-w-[430px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-200 bg-white/80 backdrop-blur-lg">
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

        {/* Report Summary */}
        <div className="p-4 bg-white/60 border-b border-emerald-200">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-gray-900">{report.title}</h2>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
              {report.status}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{formatDate(report.created_at)}</span>
            <span className="text-2xl font-bold text-emerald-600">
              {formatCurrency(report.total_amount)}
            </span>
          </div>
        </div>

        {/* Expense Items */}
        <div className="p-4 space-y-4">
          {report.items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-100"
            >
              {/* Receipt Image */}
              {item.image_url && (
                <div className="mb-4 relative h-48 rounded-xl overflow-hidden">
                  <Image
                    src={item.image_url}
                    alt="Receipt"
                    fill
                    className="object-cover"
                  />
                  {item.kra_verified && (
                    <div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-emerald-500/90 text-white text-xs font-medium">
                      ✓ Verified
                    </div>
                  )}
                </div>
              )}

              {/* Item Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Merchant</span>
                  <span className={`font-medium ${item.processing_status === 'scanning' ? 'text-gray-400 animate-pulse' : 'text-gray-900'}`}>
                    {item.merchant_name}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Amount</span>
                  <span className={`text-lg font-bold ${item.processing_status === 'scanning' ? 'text-gray-400 animate-pulse' : 'text-emerald-600'}`}>
                    {item.amount > 0 ? formatCurrency(item.amount) : 'Scanning...'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Date</span>
                  <span className="font-medium text-gray-900">
                    {formatDate(item.transaction_date)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Category</span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                    {item.category}
                  </span>
                </div>

                {/* Status Badge */}
                {item.processing_status === 'scanning' && (
                  <div className="mt-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-emerald-700">Scanning receipt...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
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
