'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { ChevronLeft, Pencil, Store, Tag, Calendar, Info, CheckCircle2, ShieldCheck, StickyNote, AlertTriangle, X, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { formatCurrency, DEFAULT_CURRENCY } from '@/lib/currency'

interface ExpenseItem {
  id: string
  image_url: string | null
  amount: number
  category: string
  merchant_name: string | null
  transaction_date: string | null
  created_at: string
  processing_status: string
  kra_verified: boolean | null
  description: string | null
  report_id: string
}

const categories = ['Fuel', 'Food', 'Transport', 'Accommodation', 'Office Supplies', 'Communication', 'Maintenance', 'Other']

export default function ExpenseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const expenseId = params.id as string

  const [expense, setExpense] = useState<ExpenseItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY)
  const [showFullImage, setShowFullImage] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedSuccess, setSavedSuccess] = useState(false)

  // Edit fields
  const [editMerchant, setEditMerchant] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editNotes, setEditNotes] = useState('')

  // Fetch workspace currency
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

  // Fetch expense
  useEffect(() => {
    const fetchExpense = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('expense_items')
          .select('*')
          .eq('id', expenseId)
          .single()

        if (fetchError || !data) throw new Error(fetchError?.message || 'Not found')
        setExpense(data)
      } catch (err: any) {
        setError(err.message || 'Failed to load expense')
      } finally {
        setLoading(false)
      }
    }
    fetchExpense()

    // Real-time updates
    const channel = supabase
      .channel(`expense-${expenseId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'expense_items', filter: `id=eq.${expenseId}` }, (payload: any) => {
        setExpense(payload.new as ExpenseItem)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [expenseId])

  const needsReview = expense?.processing_status === 'needs_review' || expense?.processing_status === 'error'
  const hasEtimsQR = expense?.kra_verified === true
  const isProcessed = expense?.processing_status === 'processed'

  const statusColor = (() => {
    if (!expense) return 'text-gray-500'
    switch (expense.processing_status) {
      case 'processed': return hasEtimsQR ? 'text-green-600' : 'text-blue-600'
      case 'scanning': return 'text-orange-500'
      case 'error': case 'needs_review': return 'text-amber-600'
      default: return 'text-gray-500'
    }
  })()

  const statusBgColor = (() => {
    if (!expense) return 'bg-gray-100'
    switch (expense.processing_status) {
      case 'processed': return hasEtimsQR ? 'bg-green-50' : 'bg-blue-50'
      case 'scanning': return 'bg-orange-50'
      case 'error': case 'needs_review': return 'bg-amber-50'
      default: return 'bg-gray-100'
    }
  })()

  const statusLabel = (() => {
    if (!expense) return ''
    switch (expense.processing_status) {
      case 'processed': return hasEtimsQR ? 'KRA Verified' : 'Verified'
      case 'scanning': return 'Processing'
      case 'error': case 'needs_review': return 'Needs Review'
      default: return expense.processing_status
    }
  })()

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, { dateStyle: 'medium' })
  }

  const initEditFields = () => {
    if (!expense) return
    setEditMerchant(expense.merchant_name || '')
    setEditAmount(expense.amount > 0 ? expense.amount.toString() : '')
    setEditCategory(expense.category || 'Other')
    const dateVal = expense.transaction_date || expense.created_at
    setEditDate(new Date(dateVal).toISOString().split('T')[0])
    const raw = expense.description || ''
    setEditNotes(raw.startsWith('AI confidence') ? '' : raw)
  }

  const startEditing = () => {
    initEditFields()
    setIsEditing(true)
    setSaveError(null)
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setSaveError(null)
  }

  const saveChanges = async () => {
    const amt = parseFloat(editAmount)
    if (isNaN(amt) || amt <= 0) {
      setSaveError('Please enter a valid amount')
      return
    }
    setIsSaving(true)
    setSaveError(null)

    try {
      const updates: Record<string, any> = {
        merchant_name: editMerchant,
        amount: amt,
        category: editCategory.toLowerCase(),
        transaction_date: new Date(editDate).toISOString(),
        processing_status: 'processed',
      }
      if (editNotes.trim()) updates.description = editNotes

      const { error: updateError } = await supabase
        .from('expense_items')
        .update(updates)
        .eq('id', expenseId)

      if (updateError) throw updateError

      // Fetch fresh data
      const { data } = await supabase.from('expense_items').select('*').eq('id', expenseId).single()
      if (data) setExpense(data)

      setIsEditing(false)
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 2000)
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  const notes = expense?.description && !expense.description.startsWith('AI confidence') ? expense.description : null

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error || !expense) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100 flex items-center justify-center">
        <p className="text-red-600">{error || 'Expense not found'}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100">
      <div className="w-full max-w-[430px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-blue-200 bg-white/80 backdrop-blur-lg sticky top-0 z-30">
          <button onClick={() => router.back()} className="p-2 -ml-2 active:scale-95 transition-transform">
            <ChevronLeft size={24} className="text-gray-900" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900 truncate max-w-[200px]">
            {expense.merchant_name || 'Expense'}
          </h1>
          {isEditing ? (
            <button onClick={cancelEditing} className="p-2 -mr-2 text-gray-500 text-sm font-medium">
              Cancel
            </button>
          ) : (
            <button onClick={startEditing} className="p-2 -mr-2 active:scale-95 transition-transform">
              <Pencil size={20} className="text-blue-600" />
            </button>
          )}
        </div>

        {isEditing ? (
          /* Edit Form */
          <div className="p-4 space-y-4">
            {/* Receipt preview */}
            {expense.image_url && (
              <div className="relative h-44 rounded-xl overflow-hidden">
                <Image src={expense.image_url} alt="Receipt" fill className="object-cover" />
              </div>
            )}

            {/* Merchant */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Merchant</label>
              <input
                type="text"
                value={editMerchant}
                onChange={e => setEditMerchant(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Merchant name"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Amount ({currency})</label>
              <input
                type="number"
                step="0.01"
                value={editAmount}
                onChange={e => setEditAmount(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="0.00"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Category</label>
              <select
                value={editCategory}
                onChange={e => setEditCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Date</label>
              <input
                type="date"
                value={editDate}
                onChange={e => setEditDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Notes</label>
              <textarea
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                placeholder="Add notes..."
              />
            </div>

            {saveError && (
              <p className="text-sm text-red-600">{saveError}</p>
            )}

            <button
              onClick={saveChanges}
              disabled={isSaving}
              className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        ) : (
          /* Detail View */
          <div className="p-4 space-y-4">
            {/* Needs Review Banner */}
            {needsReview && (
              <button onClick={startEditing} className="w-full text-left p-4 rounded-2xl bg-amber-50 border border-amber-200/60">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-700">Needs Review</p>
                    <p className="text-xs text-amber-600/80 mt-0.5">Tap to edit and correct the details below.</p>
                  </div>
                  <Pencil className="w-4 h-4 text-amber-600" />
                </div>
              </button>
            )}

            {/* Receipt Image (clickable for fullscreen) */}
            {expense.image_url && (
              <button onClick={() => setShowFullImage(true)} className="w-full block">
                <div className="relative h-72 rounded-2xl overflow-hidden">
                  <Image src={expense.image_url} alt="Receipt" fill className="object-cover" />
                </div>
              </button>
            )}

            {/* Amount Card */}
            <div className="flex flex-col items-center py-5 rounded-2xl bg-blue-50 border border-blue-100">
              <span className="text-sm text-gray-500">Amount</span>
              <span className="text-2xl font-bold text-blue-600 mt-1">
                {formatCurrency(expense.amount, currency)}
              </span>
            </div>

            {/* Details Card */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              {/* Merchant */}
              <div className="flex items-center gap-3 px-4 py-3.5">
                <Store className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Merchant</p>
                  <p className="text-sm font-medium text-gray-900">{expense.merchant_name || 'Unknown'}</p>
                </div>
              </div>
              <div className="border-t border-gray-100 ml-12" />

              {/* Category */}
              <div className="flex items-center gap-3 px-4 py-3.5">
                <Tag className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Category</p>
                  <p className="text-sm font-medium text-gray-900 capitalize">{expense.category}</p>
                </div>
              </div>
              <div className="border-t border-gray-100 ml-12" />

              {/* Date */}
              <div className="flex items-center gap-3 px-4 py-3.5">
                <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Date</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatDate(expense.transaction_date || expense.created_at)}
                  </p>
                </div>
              </div>
              <div className="border-t border-gray-100 ml-12" />

              {/* Status */}
              <div className="flex items-center gap-3 px-4 py-3.5">
                <Info className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <span className={`inline-block mt-0.5 text-xs font-medium px-2 py-1 rounded-lg ${statusColor} ${statusBgColor}`}>
                    {statusLabel}
                  </span>
                </div>
              </div>

              {/* KRA Badge */}
              {(hasEtimsQR || isProcessed) && (
                <>
                  <div className="border-t border-gray-100 ml-12" />
                  <div className="flex items-center gap-2 px-4 py-3.5">
                    {hasEtimsQR ? (
                      <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    )}
                    <span className="text-sm font-semibold text-blue-600">
                      {hasEtimsQR ? 'KRA Verified' : 'Verified'}
                    </span>
                  </div>
                </>
              )}

              {/* Notes */}
              {notes && (
                <>
                  <div className="border-t border-gray-100 ml-12" />
                  <div className="flex items-start gap-3 px-4 py-3.5">
                    <StickyNote className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">Notes</p>
                      <p className="text-sm text-gray-900 mt-0.5">{notes}</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Edit Details Button */}
            <button
              onClick={startEditing}
              className="w-full py-3 rounded-2xl border-2 border-blue-600 text-blue-600 font-medium flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors"
            >
              <Pencil className="w-4 h-4" />
              Edit Details
            </button>
          </div>
        )}

        {/* Save Success Toast */}
        {savedSuccess && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-white shadow-lg rounded-xl px-4 py-3 flex items-center gap-2 border border-green-200 animate-in slide-in-from-bottom-4">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="text-sm text-gray-900">Saved successfully</span>
          </div>
        )}
      </div>

      {/* Fullscreen Image Overlay */}
      {showFullImage && expense.image_url && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" onClick={() => setShowFullImage(false)}>
          <div className="relative w-full h-full">
            <Image src={expense.image_url} alt="Receipt" fill className="object-contain" />
          </div>
          <button
            onClick={() => setShowFullImage(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/40"
          >
            <X className="w-7 h-7 text-white/80" />
          </button>
        </div>
      )}
    </div>
  )
}
