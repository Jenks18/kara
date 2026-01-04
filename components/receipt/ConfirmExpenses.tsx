'use client'

import { useState } from 'react'
import { X, ChevronLeft, Trash2, MapPin, Globe } from 'lucide-react'
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
  const [expenses, setExpenses] = useState<ExpenseData[]>(
    images.map((imageData) => ({
      workspace: '',
      description: '',
      category: 'Fuel',
      reimbursable: false,
      imageData,
    }))
  )

  const handleRemoveExpense = (index: number) => {
    setExpenses(expenses.filter((_, i) => i !== index))
    if (expenses.length === 1) {
      onCancel()
    }
  }

  const handleContinue = () => {
    setShowLocationPrompt(true)
  }

  const handleLocationContinue = () => {
    // Request location permission
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Location:', position.coords)
          onConfirm(expenses)
        },
        (error) => {
          console.log('Location denied:', error)
          onConfirm(expenses)
        }
      )
    } else {
      onConfirm(expenses)
    }
  }

  const updateExpense = (index: number, field: keyof ExpenseData, value: any) => {
    setExpenses(expenses.map((exp, i) => (i === index ? { ...exp, [field]: value } : exp)))
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
                onClick={() => onConfirm(expenses)}
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
          <h1 className="text-lg font-semibold text-white">Confirm expenses</h1>
          <button
            onClick={onCancel}
            className="w-10 h-10 rounded-full bg-dark-100/50 hover:bg-dark-100 active:scale-95 transition-all flex items-center justify-center"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {expenses.map((expense, index) => (
            <div key={index} className="bg-dark-200 rounded-2xl p-4 space-y-4">
              {/* Receipt Image */}
              <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-dark-100">
                <Image
                  src={expense.imageData}
                  alt={`Receipt ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </div>

              {/* Form Fields */}
              <div className="space-y-3">
                {/* Workspace */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">To</label>
                  <input
                    type="text"
                    value={expense.workspace}
                    onChange={(e) => updateExpense(index, 'workspace', e.target.value)}
                    placeholder="Select workspace"
                    className="w-full bg-dark-100 text-white px-4 py-3 rounded-xl border border-gray-700 focus:border-primary focus:outline-none transition-colors"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Description</label>
                  <input
                    type="text"
                    value={expense.description}
                    onChange={(e) => updateExpense(index, 'description', e.target.value)}
                    placeholder="Add description"
                    className="w-full bg-dark-100 text-white px-4 py-3 rounded-xl border border-gray-700 focus:border-primary focus:outline-none transition-colors"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Category</label>
                  <select
                    value={expense.category}
                    onChange={(e) => updateExpense(index, 'category', e.target.value)}
                    className="w-full bg-dark-100 text-white px-4 py-3 rounded-xl border border-gray-700 focus:border-primary focus:outline-none transition-colors appearance-none cursor-pointer"
                  >
                    <option value="Fuel">Fuel</option>
                    <option value="Food">Food</option>
                    <option value="Transport">Transport</option>
                    <option value="Accommodation">Accommodation</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Reimbursable Toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-white">Reimbursable</span>
                  <button
                    onClick={() => updateExpense(index, 'reimbursable', !expense.reimbursable)}
                    className={`w-14 h-8 rounded-full transition-all ${
                      expense.reimbursable ? 'bg-primary' : 'bg-gray-700'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 bg-white rounded-full transition-transform ${
                        expense.reimbursable ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Remove button */}
              {expenses.length > 1 && (
                <button
                  onClick={() => handleRemoveExpense(index)}
                  className="w-full flex items-center justify-center gap-2 text-red-400 hover:text-red-300 py-3 transition-colors"
                >
                  <Trash2 size={18} />
                  <span className="font-medium">Remove this expense</span>
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleContinue}
            className="w-full bg-primary hover:bg-primary/90 active:scale-[0.98] text-dark-300 font-semibold py-4 rounded-full transition-all"
          >
            Create {expenses.length} expense{expenses.length > 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
