'use client'

import { useState } from 'react'
import { X, ChevronLeft, ChevronRight, Trash2, MapPin, Globe } from 'lucide-react'
import Image from 'next/image'

interface ConfirmExpensesProps {
  images: string[]
  onConfirm: (expenses: ExpenseData[]) => void
  onCancel: () => void
}

interface ExpenseData {
  workspace: string
  description: string
  category: string
  reimbursable: boolean
  imageData: string
}

export default function ConfirmExpenses({ images, onConfirm, onCancel }: ConfirmExpensesProps) {
  const [showLocationPrompt, setShowLocationPrompt] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  
  // Single expense data that applies to all images
  const [expenseData, setExpenseData] = useState({
    workspace: '',
    description: '',
    category: 'Fuel',
    reimbursable: false,
  })

  const handleContinue = () => {
    setShowLocationPrompt(true)
  }

  const handleLocationContinue = () => {
    // Request location permission
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Location:', position.coords)
          // Create expense data for all images with same details
          const expenses = images.map(imageData => ({
            ...expenseData,
            imageData
          }))
          onConfirm(expenses)
        },
        (error) => {
          console.log('Location denied:', error)
          const expenses = images.map(imageData => ({
            ...expenseData,
            imageData
          }))
          onConfirm(expenses)
        }
      )
    } else {
      const expenses = images.map(imageData => ({
        ...expenseData,
        imageData
      }))
      onConfirm(expenses)
    }
  }

  const updateField = (field: keyof typeof expenseData, value: any) => {
    setExpenseData(prev => ({ ...prev, [field]: value }))
  }

  const goToPrevImage = () => {
    setCurrentImageIndex(prev => Math.max(0, prev - 1))
  }

  const goToNextImage = () => {
    setCurrentImageIndex(prev => Math.min(images.length - 1, prev + 1))
  }

  if (showLocationPrompt) {
    return (
      <div className="fixed inset-0 bg-dark-300 z-50">
        <div className="h-full flex flex-col items-center justify-center p-6">
          <div className="max-w-[430px] w-full bg-dark-200 rounded-3xl p-8 text-center">
            {/* Icon */}
            <div className="w-24 h-24 rounded-full bg-primary/10 mx-auto mb-6 flex items-center justify-center">
              <div className="relative">
                <Globe size={40} className="text-primary" strokeWidth={2} />
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-dark-200 rounded-full flex items-center justify-center border-2 border-primary">
                  <MapPin size={16} className="text-primary" />
                </div>
              </div>
            </div>

            {/* Heading */}
            <h2 className="text-2xl font-bold text-white mb-3">Allow location access</h2>
            <p className="text-gray-400 mb-8">
              We use your location to automatically tag expenses and provide better insights
            </p>

            {/* Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleLocationContinue}
                className="w-full bg-primary hover:bg-primary/90 active:scale-[0.98] text-dark-300 font-semibold py-4 rounded-full transition-all"
              >
                Continue
              </button>
              <button
                onClick={() => {
                  const expenses = images.map(imageData => ({
                    ...expenseData,
                    imageData
                  }))
                  onConfirm(expenses)
                }}
                className="w-full bg-transparent hover:bg-dark-100/50 active:scale-[0.98] text-gray-400 font-medium py-4 rounded-full transition-all"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-dark-300 z-50 overflow-hidden">
      <div className="h-full flex flex-col max-w-[430px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <button
            onClick={onCancel}
            className="w-10 h-10 rounded-full bg-dark-100/50 hover:bg-dark-100 active:scale-95 transition-all flex items-center justify-center"
          >
            <ChevronLeft size={24} className="text-gray-400" />
          </button>
          
          <div className="flex flex-col items-center">
            <h1 className="text-lg font-semibold text-white">Confirm details</h1>
            {images.length > 1 && (
              <div className="flex items-center gap-3 mt-1">
                <button
                  onClick={goToPrevImage}
                  disabled={currentImageIndex === 0}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    currentImageIndex === 0
                      ? 'bg-dark-100/30 text-gray-600 cursor-not-allowed'
                      : 'bg-dark-100/50 hover:bg-dark-100 text-gray-400 active:scale-95'
                  }`}
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-sm text-gray-400">
                  {currentImageIndex + 1} of {images.length}
                </span>
                <button
                  onClick={goToNextImage}
                  disabled={currentImageIndex === images.length - 1}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    currentImageIndex === images.length - 1
                      ? 'bg-dark-100/30 text-gray-600 cursor-not-allowed'
                      : 'bg-dark-100/50 hover:bg-dark-100 text-gray-400 active:scale-95'
                  }`}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>
          
          <button
            onClick={onCancel}
            className="w-10 h-10 rounded-full bg-dark-100/50 hover:bg-dark-100 active:scale-95 transition-all flex items-center justify-center"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {/* Workspace Section */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">To</label>
              <button
                onClick={() => {/* TODO: Open workspace selector */}}
                className="w-full bg-dark-200 hover:bg-dark-100 active:scale-[0.99] transition-all rounded-2xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl">
                    T
                  </div>
                  <div className="text-left">
                    <div className="text-white font-medium">Terpmail's Workspace</div>
                    <div className="text-sm text-gray-400">Submits to injenga@terpmail.umd.edu</div>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </button>
            </div>

            {/* Receipt Image */}
            <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-dark-100">
              <Image
                src={images[currentImageIndex]}
                alt={`Receipt ${currentImageIndex + 1}`}
                fill
                className="object-cover"
              />
            </div>

            {/* Description */}
            <button
              onClick={() => {/* TODO: Open description input */}}
              className="w-full bg-transparent hover:bg-dark-200/50 active:scale-[0.99] transition-all rounded-2xl p-4 flex items-center justify-between border-b border-gray-800"
            >
              <span className="text-white">Description</span>
              <ChevronRight size={20} className="text-gray-400" />
            </button>

            {/* Category */}
            <button
              onClick={() => {/* TODO: Open category selector */}}
              className="w-full bg-transparent hover:bg-dark-200/50 active:scale-[0.99] transition-all rounded-2xl p-4 flex items-center justify-between border-b border-gray-800"
            >
              <span className="text-white">Category</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Required</span>
                <ChevronRight size={20} className="text-gray-400" />
              </div>
            </button>

            {/* Reimbursable Toggle */}
            <div className="flex items-center justify-between py-2">
              <span className="text-white">Reimbursable</span>
              <button
                onClick={() => updateField('reimbursable', !expenseData.reimbursable)}
                className={`w-14 h-8 rounded-full transition-all ${
                  expenseData.reimbursable ? 'bg-primary' : 'bg-gray-700'
                }`}
              >
                <div
                  className={`w-6 h-6 bg-white rounded-full transition-transform ${
                    expenseData.reimbursable ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Report Section */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Report</label>
              <div className="text-white text-lg">New report</div>
            </div>

            {/* Remove button */}
            <button
              onClick={onCancel}
              className="w-full flex items-center justify-center gap-2 text-gray-400 hover:text-red-400 py-3 transition-colors mt-8"
            >
              <Trash2 size={18} />
              <span className="font-medium">Remove this expense</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleContinue}
            className="w-full bg-primary hover:bg-primary/90 active:scale-[0.98] text-dark-300 font-semibold py-4 rounded-full transition-all"
          >
            Create {images.length} expense{images.length > 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
