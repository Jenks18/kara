'use client'

import { useState } from 'react'
import { X, AlertCircle, Check } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

interface ReviewFormData {
  litres?: number
  fuelType?: string
  vehicleNumber?: string
  odometer?: number
}

interface ReceiptReviewModalProps {
  receiptData: {
    imageUrl: string
    merchant: string
    totalAmount: number
    date: string
    missingFields: string[]
  }
  onSubmit: (data: ReviewFormData) => void
  onCancel: () => void
}

export default function ReceiptReviewModal({ 
  receiptData, 
  onSubmit, 
  onCancel 
}: ReceiptReviewModalProps) {
  const [formData, setFormData] = useState<ReviewFormData>({})
  const [submitting, setSubmitting] = useState(false)
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    
    // Simulate API call
    setTimeout(() => {
      onSubmit(formData)
    }, 1000)
  }
  
  const needsLitres = receiptData.missingFields.includes('litres')
  const needsFuelType = receiptData.missingFields.includes('fuelType')
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Review Receipt</h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6">
          {/* Info Banner */}
          <div className="flex items-start gap-3 p-4 bg-warning-500/10 border border-warning-500/20 rounded-xl mb-6">
            <AlertCircle size={20} className="text-warning-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-warning-500 font-medium mb-1">
                Missing Information
              </p>
              <p className="text-xs text-gray-500">
                We captured your receipt but couldn't read some details. Please fill them in below.
              </p>
            </div>
          </div>
          
          {/* Receipt Preview */}
          <Card className="mb-6">
            <h3 className="text-sm font-semibold text-gray-600 mb-3">Receipt Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Merchant:</span>
                <span className="text-gray-900 font-medium">{receiptData.merchant}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date:</span>
                <span className="text-gray-900">{receiptData.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total:</span>
                <span className="text-gray-900 font-mono font-semibold">
                  KES {receiptData.totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </Card>
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Litres Input */}
            {needsLitres && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Litres <span className="text-danger-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.litres || ''}
                  onChange={(e) => setFormData({ ...formData, litres: parseFloat(e.target.value) })}
                  className="
                    w-full px-4 py-3 
                    bg-gray-50 border border-gray-200
                    rounded-xl
                    text-gray-900 placeholder-gray-400
                    focus:outline-none focus:ring-2 focus:ring-primary-500
                  "
                  placeholder="e.g., 25.5"
                />
                {formData.litres && (
                  <p className="text-xs text-gray-500 mt-1">
                    Price per litre: KES {(receiptData.totalAmount / formData.litres).toFixed(2)}
                  </p>
                )}
              </div>
            )}
            
            {/* Fuel Type Select */}
            {needsFuelType && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fuel Type <span className="text-danger-500">*</span>
                </label>
                <select
                  required
                  value={formData.fuelType || ''}
                  onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                  className="
                    w-full px-4 py-3 
                    bg-gray-50 border border-gray-200
                    rounded-xl
                    text-gray-900
                    focus:outline-none focus:ring-2 focus:ring-primary-500
                  "
                >
                  <option value="">Select fuel type</option>
                  <option value="PETROL">Petrol</option>
                  <option value="DIESEL">Diesel</option>
                  <option value="SUPER">Super</option>
                  <option value="GAS">Gas</option>
                  <option value="KEROSENE">Kerosene</option>
                </select>
              </div>
            )}
            
            {/* Optional Fields */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vehicle Number <span className="text-gray-400">(Optional)</span>
              </label>
              <input
                type="text"
                value={formData.vehicleNumber || ''}
                onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                className="
                  w-full px-4 py-3 
                  bg-gray-50 border border-gray-200
                  rounded-xl
                  text-gray-900 placeholder-gray-400
                  focus:outline-none focus:ring-2 focus:ring-primary-500
                "
                placeholder="e.g., KBX 123A"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Odometer Reading <span className="text-gray-400">(Optional)</span>
              </label>
              <input
                type="number"
                value={formData.odometer || ''}
                onChange={(e) => setFormData({ ...formData, odometer: parseInt(e.target.value) })}
                className="
                  w-full px-4 py-3 
                  bg-gray-50 border border-gray-200
                  rounded-xl
                  text-gray-900 placeholder-gray-400
                  focus:outline-none focus:ring-2 focus:ring-primary-500
                "
                placeholder="e.g., 45000"
              />
            </div>
            
            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={onCancel}
                disabled={submitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={submitting}
                className="flex-1"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check size={20} className="mr-2" />
                    Save Receipt
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
