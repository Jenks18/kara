'use client'

import { useState, useEffect } from 'react'
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
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Single expense data that applies to all images
  const [expenseData, setExpenseData] = useState({
    workspace: '',
    description: '',
    category: 'Fuel',
    reimbursable: false,
  })

  // Check if location permission was already granted
  useEffect(() => {
    const checkLocationPermission = async () => {
      if ('permissions' in navigator) {
        try {
          const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName })
          if (result.state === 'granted') {
            setLocationPermissionGranted(true)
          }
        } catch (error) {
          // If permission API not available, check localStorage
          const hasPermission = localStorage.getItem('locationPermissionGranted')
          if (hasPermission === 'true') {
            setLocationPermissionGranted(true)
          }
        }
      } else {
        // Fallback to localStorage
        const hasPermission = localStorage.getItem('locationPermissionGranted')
        if (hasPermission === 'true') {
          setLocationPermissionGranted(true)
        }
      }
    }
    checkLocationPermission()
  }, [])

  const handleContinue = async () => {
    if (isSubmitting) return; // Prevent double-click
    setIsSubmitting(true);
    
    // If location permission already granted, submit directly
    if (locationPermissionGranted) {
      const expenses = images.map(imageData => ({
        ...expenseData,
        imageData
      }))
      onConfirm(expenses)
      return
    }

    // Otherwise, show location permission prompt
    setShowLocationPrompt(true)
  }

  const handleLocationContinue = () => {
    // Hide the prompt immediately
    setShowLocationPrompt(false)
    
    // Request location permission
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Save permission state
          localStorage.setItem('locationPermissionGranted', 'true')
          setLocationPermissionGranted(true)
          // Create expense data for all images with same details
          const expenses = images.map(imageData => ({
            ...expenseData,
            imageData
          }))
          onConfirm(expenses)
        },
        (error) => {
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
    setCurrentImageIndex(prev => {
      const newIndex = Math.max(0, prev - 1)
      return newIndex
    })
  }

  const goToNextImage = () => {
    setCurrentImageIndex(prev => {
      const newIndex = Math.min(images.length - 1, prev + 1)
      return newIndex
    })
  }

  if (showLocationPrompt) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100 z-50">
        <div className="h-full flex flex-col items-center justify-center p-6">
          <div className="max-w-[430px] w-full bg-white rounded-3xl p-8 text-center border border-gray-200 shadow-lg">
            {/* Icon */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500/10 to-emerald-400/10 mx-auto mb-6 flex items-center justify-center ring-2 ring-emerald-500/20">
              <div className="relative">
                <Globe size={40} className="text-emerald-500" strokeWidth={2} />
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center border-2 border-emerald-500">
                  <MapPin size={16} className="text-emerald-500" />
                </div>
              </div>
            </div>

            {/* Heading */}
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Allow location access</h2>
            <p className="text-gray-500 mb-8">
              We use your location to automatically tag expenses and provide better insights
            </p>

            {/* Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleLocationContinue}
                className="w-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400 hover:from-emerald-700 hover:via-emerald-600 hover:to-emerald-500 active:scale-[0.98] text-white font-semibold py-4 rounded-full transition-all duration-300 shadow-emerald-md hover:shadow-emerald-lg"
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
                className="w-full bg-transparent hover:bg-gray-100 active:scale-[0.98] text-gray-600 hover:text-gray-900 font-medium py-4 rounded-full transition-all duration-200 border border-gray-300 hover:border-gray-400"
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
    <div className="fixed inset-0 bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100 z-50 overflow-hidden">
      <div className="h-full flex flex-col max-w-[430px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-emerald-200 bg-white/80 backdrop-blur-lg relative z-50">
          <button
            onClick={onCancel}
            className="w-10 h-10 rounded-full bg-white hover:bg-gray-50 active:scale-95 transition-all flex items-center justify-center border border-gray-200 shadow-sm"
          >
            <ChevronLeft size={24} className="text-gray-900" />
          </button>
          
          <div className="flex flex-col items-center relative z-50">
            <h1 className="text-lg font-semibold text-gray-900">Confirm details</h1>
            {images.length > 1 && (
              <div className="flex items-center gap-3 mt-1 pointer-events-auto">
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (currentImageIndex > 0) {
                      goToPrevImage()
                    }
                  }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 touch-manipulation ${
                    currentImageIndex === 0
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'
                      : 'bg-emerald-600 text-white active:scale-95 shadow-xl border-2 border-emerald-400'
                  }`}
                >
                  <ChevronLeft size={20} strokeWidth={3} />
                </button>
                <span className="text-sm text-gray-700 font-semibold">
                  {currentImageIndex + 1} of {images.length}
                </span>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (currentImageIndex < images.length - 1) {
                      goToNextImage()
                    }
                  }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 touch-manipulation ${
                    currentImageIndex === images.length - 1
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'
                      : 'bg-emerald-600 text-white active:scale-95 shadow-xl border-2 border-emerald-400'
                  }`}
                >
                  <ChevronRight size={20} strokeWidth={3} />
                </button>
              </div>
            )}
          </div>
          
          <button
            onClick={onCancel}
            className="w-10 h-10 rounded-full bg-white hover:bg-gray-50 active:scale-95 transition-all flex items-center justify-center border border-gray-200 shadow-sm"
          >
            <X size={20} className="text-gray-900" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {/* Workspace Section */}
            <div>
              <label className="block text-sm text-gray-600 font-medium mb-2">To</label>
              <button
                onClick={() => {/* TODO: Open workspace selector */}}
                className="w-full bg-white hover:bg-gray-50 active:scale-[0.99] transition-all rounded-2xl p-4 flex items-center justify-between border border-gray-200 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
                    T
                  </div>
                  <div className="text-left">
                    <div className="text-gray-900 font-medium">Terpmail's Workspace</div>
                    <div className="text-sm text-gray-600">Submits to injenga@terpmail.umd.edu</div>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Receipt Image */}
            <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-gray-100 border border-gray-300 shadow-sm">
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
              className="w-full bg-white hover:bg-gray-50 active:scale-[0.99] transition-all rounded-2xl p-4 flex items-center justify-between border border-gray-200 shadow-sm"
            >
              <span className="text-gray-900">Description</span>
              <ChevronRight size={20} className="text-gray-500" />
            </button>

            {/* Category */}
            <button
              onClick={() => {/* TODO: Open category selector */}}
              className="w-full bg-white hover:bg-gray-50 active:scale-[0.99] transition-all rounded-2xl p-4 flex items-center justify-between border border-gray-200 shadow-sm"
            >
              <span className="text-gray-900">Category</span>
              <div className="flex items-center gap-2">
                <span className="text-emerald-600 font-medium">Fuel</span>
                <ChevronRight size={20} className="text-gray-500" />
              </div>
            </button>

            {/* Reimbursable Toggle */}
            <div className="flex items-center justify-between py-2 bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
              <span className="text-gray-900">Reimbursable</span>
              <button
                onClick={() => updateField('reimbursable', !expenseData.reimbursable)}
                className={`w-14 h-8 rounded-full transition-all duration-200 ${
                  expenseData.reimbursable ? 'bg-gradient-to-r from-emerald-500 to-green-600' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-200 ${
                    expenseData.reimbursable ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Report Section */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
              <label className="block text-sm text-gray-600 font-medium mb-2">Report</label>
              <div className="text-gray-900 text-lg">New report</div>
            </div>

            {/* Remove button */}
            <button
              onClick={onCancel}
              className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-red-600 py-3 transition-colors mt-8"
            >
              <Trash2 size={18} />
              <span className="font-medium">Remove this expense</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-emerald-200 bg-white/80 backdrop-blur-lg">
          <button
            onClick={handleContinue}
            disabled={isSubmitting}
            className={`w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 active:scale-[0.98] text-white font-semibold py-4 rounded-full transition-all duration-300 shadow-md ${
              isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? 'Creating...' : `Create ${images.length} expense${images.length > 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
