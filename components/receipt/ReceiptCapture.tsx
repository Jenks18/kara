'use client'

import { useState, useRef } from 'react'
import { Camera, X, Check, AlertCircle } from 'lucide-react'
import Button from '@/components/ui/Button'

interface ReceiptCaptureProps {
  onCapture: (imageData: string) => void
  onCancel: () => void
}

export default function ReceiptCapture({ onCapture, onCancel }: ReceiptCaptureProps) {
  const [capturing, setCapturing] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onloadend = () => {
      const imageData = reader.result as string
      setPreview(imageData)
    }
    reader.readAsDataURL(file)
  }
  
  const handleConfirm = () => {
    if (preview) {
      setCapturing(true)
      // Simulate upload delay
      setTimeout(() => {
        onCapture(preview)
      }, 800)
    }
  }
  
  const handleRetake = () => {
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }
  
  return (
    <div className="fixed inset-0 bg-dark-200 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
        <button
          onClick={onCancel}
          className="p-2 hover:bg-dark-100 rounded-full transition-colors"
        >
          <X size={24} className="text-gray-300" />
        </button>
        <h2 className="text-lg font-semibold text-gray-100">Scan Receipt</h2>
        <div className="w-10" /> {/* Spacer */}
      </div>
      
      {/* Camera/Preview Area */}
      <div className="flex-1 relative flex items-center justify-center bg-black">
        {!preview ? (
          // Camera View with Guide
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Guide Rectangle */}
            <div className="relative w-[85%] max-w-sm aspect-[3/4]">
              {/* Yellow Guide Border */}
              <div className="absolute inset-0 border-4 border-yellow-400 rounded-2xl opacity-80">
                {/* Corner Markers */}
                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-yellow-400 rounded-tl-xl" />
                <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-yellow-400 rounded-tr-xl" />
                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-yellow-400 rounded-bl-xl" />
                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-yellow-400 rounded-br-xl" />
              </div>
              
              {/* Instruction Text */}
              <div className="absolute -bottom-16 left-0 right-0 text-center">
                <p className="text-white text-sm font-medium">
                  Position receipt within frame
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  Make sure QR code is visible
                </p>
              </div>
            </div>
            
            {/* Mock Camera Feed Message */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black/60 px-6 py-4 rounded-xl">
                <Camera size={48} className="text-gray-400 mx-auto mb-2" />
                <p className="text-gray-300 text-sm">Camera Preview</p>
              </div>
            </div>
          </div>
        ) : (
          // Image Preview
          <div className="relative w-full h-full flex items-center justify-center p-4">
            <img
              src={preview}
              alt="Receipt preview"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            
            {capturing && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="bg-dark-100 px-6 py-4 rounded-2xl flex flex-col items-center">
                  <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-white font-medium">Uploading...</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Bottom Actions */}
      <div className="px-4 py-6 bg-dark-100 border-t border-gray-800">
        {!preview ? (
          <div className="flex flex-col gap-3">
            {/* Capture Button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => fileInputRef.current?.click()}
              className="text-lg"
            >
              <Camera size={24} className="mr-2" />
              Take Photo
            </Button>
            
            {/* Gallery Button */}
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => {
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = 'image/*'
                input.onchange = (e: any) => handleFileSelect(e)
                input.click()
              }}
            >
              Choose from Gallery
            </Button>
            
            {/* Tips */}
            <div className="mt-2 flex items-start gap-2 text-xs text-gray-400">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <p>
                Ensure the QR code and total amount are clearly visible for best results
              </p>
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="lg"
              onClick={handleRetake}
              disabled={capturing}
              className="flex-1"
            >
              Retake
            </Button>
            <Button
              variant="primary"
              size="lg"
              onClick={handleConfirm}
              disabled={capturing}
              className="flex-1"
            >
              <Check size={20} className="mr-2" />
              Use Photo
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
