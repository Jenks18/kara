'use client'

import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, Trash2, MapPin, Globe, ChevronDown } from 'lucide-react'
import Image from 'next/image'
import { useUser } from '@clerk/nextjs'

interface ConfirmExpensesProps {
  images: string[]
  onConfirm: (expenses: ExpenseData[]) => void
  onCancel: () => void
}

interface ExpenseData {
  workspace: string
  workspaceName: string
  description: string
  category: string
  reimbursable: boolean
  imageData: string
}

interface WorkspaceOption {
  id: string
  name: string
  avatar: string
  is_active: boolean
}

const CATEGORIES = [
  'Fuel', 'Food', 'Transport', 'Accommodation', 'Office Supplies',
  'Communication', 'Maintenance', 'Shopping', 'Entertainment', 'Utilities', 'Health', 'Other'
]

export default function ConfirmExpenses({ images, onConfirm, onCancel }: ConfirmExpensesProps) {
  const { user } = useUser()
  const [showLocationPrompt, setShowLocationPrompt] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([])
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false)
  
  // Single expense data that applies to all images
  const [expenseData, setExpenseData] = useState({
    workspace: '',
    workspaceName: '',
    description: '',
    category: 'Fuel',
    reimbursable: false,
  })

  // Fetch workspaces on mount
  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const res = await fetch('/api/workspaces')
        if (res.ok) {
          const data = await res.json()
          const ws = data.workspaces || data || []
          setWorkspaces(ws)
          // Auto-select active workspace, or first
          const active = ws.find((w: WorkspaceOption) => w.is_active) || ws[0]
          if (active) {
            setExpenseData(prev => ({ ...prev, workspace: active.id, workspaceName: active.name }))
          }
        }
      } catch (e) {
        console.warn('Could not fetch workspaces:', e)
      }
    }
    fetchWorkspaces()
  }, [])

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
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100 z-50">
        <div className="h-full flex flex-col items-center justify-center p-6">
          <div className="max-w-[430px] w-full bg-white rounded-3xl p-8 text-center border border-gray-200 shadow-lg">
            {/* Icon */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500/10 to-blue-400/10 mx-auto mb-6 flex items-center justify-center ring-2 ring-blue-500/20">
              <div className="relative">
                <Globe size={40} className="text-blue-500" strokeWidth={2} />
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center border-2 border-blue-500">
                  <MapPin size={16} className="text-blue-500" />
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
                className="w-full bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 hover:from-blue-700 hover:via-blue-600 hover:to-blue-500 active:scale-[0.98] text-white font-semibold py-4 rounded-full transition-all duration-300 shadow-blue-md hover:shadow-blue-lg"
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
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100 z-50 overflow-hidden">
      <div className="h-full flex flex-col max-w-[430px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-blue-200 bg-white/80 backdrop-blur-lg relative z-50">
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
                      : 'bg-blue-600 text-white active:scale-95 shadow-xl border-2 border-blue-400'
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
                      : 'bg-blue-600 text-white active:scale-95 shadow-xl border-2 border-blue-400'
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
              <label className="block text-sm text-gray-600 font-medium mb-2">Workspace</label>
              <div className="relative">
                <button
                  onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
                  className="w-full bg-white hover:bg-gray-50 active:scale-[0.99] transition-all rounded-2xl p-4 flex items-center justify-between border border-gray-200 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
                      {expenseData.workspaceName ? expenseData.workspaceName.charAt(0).toUpperCase() : 'W'}
                    </div>
                    <div className="text-left">
                      <div className="text-gray-900 font-medium">{expenseData.workspaceName || 'Select workspace'}</div>
                      <div className="text-sm text-gray-600">Submit expenses to this workspace</div>
                    </div>
                  </div>
                  <ChevronDown size={20} className="text-gray-500" />
                </button>
                {showWorkspaceDropdown && workspaces.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {workspaces.map(ws => (
                      <button
                        key={ws.id}
                        onClick={() => {
                          updateField('workspace', ws.id)
                          setExpenseData(prev => ({ ...prev, workspace: ws.id, workspaceName: ws.name }))
                          setShowWorkspaceDropdown(false)
                        }}
                        className={`w-full px-4 py-3 text-left hover:bg-blue-50 flex items-center gap-3 ${
                          expenseData.workspace === ws.id ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                          {ws.avatar || ws.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-gray-900 font-medium">{ws.name}</span>
                        {ws.is_active && (
                          <span className="ml-auto text-xs text-blue-600 font-medium bg-blue-100 px-2 py-0.5 rounded-full">Active</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
            <div>
              <label className="block text-sm text-gray-600 font-medium mb-2">Description / Notes</label>
              <input
                type="text"
                value={expenseData.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Add a description or notes"
                className="w-full bg-white rounded-2xl p-4 border border-gray-200 shadow-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
              />
            </div>

            {/* Category */}
            <div className="relative">
              <label className="block text-sm text-gray-600 font-medium mb-2">Category</label>
              <button
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                className="w-full bg-white hover:bg-gray-50 active:scale-[0.99] transition-all rounded-2xl p-4 flex items-center justify-between border border-gray-200 shadow-sm"
              >
                <span className="text-gray-900">Category</span>
                <div className="flex items-center gap-2">
                  <span className="text-blue-600 font-medium">{expenseData.category}</span>
                  <ChevronDown size={20} className="text-gray-500" />
                </div>
              </button>
              {showCategoryDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => {
                        updateField('category', cat)
                        setShowCategoryDropdown(false)
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-blue-50 text-gray-900 ${
                        expenseData.category === cat ? 'bg-blue-50 font-medium' : ''
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reimbursable Toggle */}
            <div className="flex items-center justify-between py-2 bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
              <span className="text-gray-900">Reimbursable</span>
              <button
                onClick={() => updateField('reimbursable', !expenseData.reimbursable)}
                className={`w-14 h-8 rounded-full transition-all duration-200 ${
                  expenseData.reimbursable ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gray-300'
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
        <div className="p-4 border-t border-blue-200 bg-white/80 backdrop-blur-lg">
          <button
            onClick={handleContinue}
            disabled={isSubmitting}
            className={`w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 active:scale-[0.98] text-white font-semibold py-4 rounded-full transition-all duration-300 shadow-md ${
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
