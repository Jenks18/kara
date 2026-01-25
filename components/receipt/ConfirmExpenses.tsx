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
    setCurrentImageIndex(prev => Math.max(0, prev - 1))
  }

  const goToNextImage = () => {
    setCurrentImageIndex(prev => Math.min(images.length - 1, prev + 1))
  }

  if (showLocationPrompt) {
    return (
      <div className="fixed inset-0 bg-dark-300 z-50">
        <div className="h-full flex flex-col items-center justify-center p-6">
          <div className="max-w-[430px] w-full bg-dark-200 rounded-3xl p-8 text-center border border-gray-700">
            {/* Icon */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500/10 to-emerald-400/10 mx-auto mb-6 flex items-center justify-center ring-2 ring-emerald-500/20">
              <div className="relative">
                <Globe size={40} className="text-emerald-500" strokeWidth={2} />
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-dark-200 rounded-full flex items-center justify-center border-2 border-emerald-500">
                  <MapPin size={16} className="text-emerald-500" />
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
                className="w-full bg-transparent hover:bg-dark-200/50 active:scale-[0.98] text-gray-300 hover:text-white font-medium py-4 rounded-full transition-all duration-200 border border-gray-600 hover:border-gray-500"
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
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <button
            onClick={onCancel}
            className="w-10 h-10 rounded-full bg-dark-200 hover:bg-dark-100 active:scale-95 transition-all flex items-center justify-center border border-gray-600"
          >
            <ChevronLeft size={24} className="text-gray-300" />
          </button>
          
          <div className="flex flex-col items-center">
            <h1 className="text-lg font-semibold text-white">Confirm details</h1>
            {images.length > 1 && (
              <div className="flex items-center gap-3 mt-1">
                <button
                  onClick={goToPrevImage}
                  disabled={currentImageIndex === 0}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                    currentImageIndex === 0
                      ? 'bg-dark-100/30 text-gray-600 cursor-not-allowed'
                      : 'bg-gradient-to-br from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white active:scale-95 shadow-emerald-sm'
                  }`}
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-sm text-gray-300 font-medium">
                  {currentImageIndex + 1} of {images.length}
                </span>
                <button
                  onClick={goToNextImage}
                  disabled={currentImageIndex === images.length - 1}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                    currentImageIndex === images.length - 1
                      ? 'bg-dark-100/30 text-gray-600 cursor-not-allowed'
                      : 'bg-gradient-to-br from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white active:scale-95 shadow-emerald-sm'
                  }`}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>
          
          <button
            onClick={onCancel}
            className="w-10 h-10 rounded-full bg-dark-200 hover:bg-dark-100 active:scale-95 transition-all flex items-center justify-center border border-gray-600"
          >
            <X size={20} className="text-gray-300" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {/* Workspace Section */}
            <div>
              <label className="block text-sm text-gray-400 font-medium mb-2">To</label>
              <button
                onClick={() => {/* TODO: Open workspace selector */}}
                className="w-full bg-dark-200 hover:bg-dark-100 active:scale-[0.99] transition-all rounded-2xl p-4 flex items-center justify-between border border-gray-700"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white font-bold text-xl shadow-emerald-md">
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
            <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-dark-100 border border-gray-700">
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
              className="w-full bg-transparent hover:bg-dark-200/50 active:scale-[0.99] transition-all rounded-2xl p-4 flex items-center justify-between border-b border-gray-700"
            >
              <span className="text-white">Description</span>
              <ChevronRight size={20} className="text-gray-400" />
            </button>

            {/* Category */}
            <button
              onClick={() => {/* TODO: Open category selector */}}
              className="w-full bg-transparent hover:bg-dark-200/50 active:scale-[0.99] transition-all rounded-2xl p-4 flex items-center justify-between border-b border-gray-700"
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
                className={`w-14 h-8 rounded-full transition-all duration-200 ${
                  expenseData.reimbursable ? 'bg-gradient-to-r from-emerald-600 to-emerald-500' : 'bg-gray-600'
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
            <div>
              <label className="block text-sm text-gray-400 font-medium mb-2">Report</label>
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
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={handleContinue}
            disabled={isSubmitting}
            className={`w-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400 hover:from-emerald-700 hover:via-emerald-600 hover:to-emerald-500 active:scale-[0.98] text-white font-semibold py-4 rounded-full transition-all duration-300 shadow-emerald-md hover:shadow-emerald-lg ${
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
