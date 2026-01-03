'use client'

import { useState, useRef } from 'react'
import { Camera, X, Image as ImageIcon, Receipt, ChevronRight, Zap, Pen } from 'lucide-react'

interface ReceiptCaptureProps {
  onCapture: (imageData: string) => void
  onCancel: () => void
}

export default function ReceiptCapture({ onCapture, onCancel }: ReceiptCaptureProps) {
  const [activeTab, setActiveTab] = useState<'manual' | 'scan'>('scan')
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const multiFileInputRef = useRef<HTMLInputElement>(null)
  
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

  const handleMultiFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    files.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const imageData = reader.result as string
        setSelectedImages(prev => [...prev, imageData])
      }
      reader.readAsDataURL(file)
    })
  }

  const handleRemoveImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleProcessMultiple = () => {
    if (selectedImages.length > 0) {
      onCapture(selectedImages[0])
    }
  }

  const handleConfirm = () => {
    if (preview) {
      onCapture(preview)
    }
  }
  
  return (
    <div className="fixed inset-0 bg-dark-300 z-50 flex flex-col">
      {/* Header */}
      <div className="flex flex-col px-4 pt-6 pb-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onCancel}
            className="p-2 -ml-2 active:scale-95 transition-transform"
          >
            <X size={24} className="text-gray-300" />
          </button>
          <h2 className="text-lg font-semibold text-gray-100">Create expense</h2>
          <div className="w-10" />
        </div>

        {/* Manual/Scan Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full transition-all ${
              activeTab === 'manual'
                ? 'bg-dark-100 text-gray-100'
                : 'bg-transparent text-gray-400'
            }`}
          >
            <Pen size={20} />
            Manual
          </button>
          <button
            onClick={() => setActiveTab('scan')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full transition-all ${
              activeTab === 'scan'
                ? 'bg-primary text-dark-300'
                : 'bg-transparent text-gray-400'
            }`}
          >
            <Receipt size={20} />
            Scan
          </button>
        </div>
      </div>

      {/* Camera/Preview Area */}
      <div className="flex-1 relative flex flex-col items-center justify-center bg-black overflow-hidden">
        {!preview && selectedImages.length === 0 ? (
          // Camera Permission / Intro Screen
          <div className="flex flex-col items-center justify-center px-8 text-center">
            <div className="mb-8">
              <div className="relative inline-block">
                {/* Illustration - Phone with receipt */}
                <div className="w-48 h-64 bg-primary/20 rounded-3xl flex items-center justify-center">
                  <div className="w-32 h-48 bg-primary/40 rounded-2xl flex items-center justify-center">
                    <Receipt size={64} className="text-primary" />
                  </div>
                </div>
                {/* Hand illustration */}
                <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-warning/30 rounded-full flex items-center justify-center">
                  <Camera size={32} className="text-warning" />
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-3">Take a photo</h2>
            <p className="text-gray-400 mb-8 max-w-xs">
              Camera access is required to take pictures of receipts.
            </p>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-primary hover:bg-primary/90 active:scale-95 text-dark-300 font-semibold px-12 py-4 rounded-full transition-all"
            >
              Continue
            </button>
          </div>
        ) : selectedImages.length > 0 ? (
          // Multi-select mode with thumbnails
          <div className="w-full h-full flex items-center justify-center">
            <div className="relative w-full max-w-md">
              <img
                src={selectedImages[selectedImages.length - 1]}
                alt="Selected receipt"
                className="w-full h-auto rounded-2xl"
              />
              {/* Flash icon overlay */}
              <div className="absolute top-4 right-4 w-12 h-12 bg-dark-300/80 backdrop-blur rounded-full flex items-center justify-center">
                <Zap size={24} className="text-primary" />
              </div>
            </div>
          </div>
        ) : (
          // Image Preview (single)
          <div className="relative w-full h-full flex items-center justify-center p-4">
            <img
              src={preview || ''}
              alt="Receipt preview"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        )}
      </div>
      
      {/* Bottom Controls */}
      <div className="px-6 py-4 bg-dark-300 safe-area-bottom">
        {selectedImages.length > 0 ? (
          // Multi-select mode bottom controls
          <div className="space-y-4">
            {/* Thumbnail strip */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {selectedImages.map((img, index) => (
                <div key={index} className="relative flex-shrink-0">
                  <img
                    src={img}
                    alt={`Receipt ${index + 1}`}
                    className="w-16 h-20 object-cover rounded-lg border-2 border-primary"
                  />
                  <button
                    onClick={() => handleRemoveImage(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-danger rounded-full flex items-center justify-center"
                  >
                    <X size={14} className="text-white" />
                  </button>
                </div>
              ))}
              
              {/* Add more button */}
              <button
                onClick={() => multiFileInputRef.current?.click()}
                className="w-16 h-20 rounded-lg border-2 border-dashed border-gray-700 flex items-center justify-center flex-shrink-0"
              >
                <Camera size={24} className="text-gray-500" />
              </button>
            </div>

            {/* Process button */}
            <button
              onClick={handleProcessMultiple}
              className="w-full bg-primary hover:bg-primary/90 active:scale-[0.98] text-dark-300 font-semibold py-4 rounded-full transition-all flex items-center justify-center gap-2"
            >
              Process {selectedImages.length} receipt{selectedImages.length > 1 ? 's' : ''}
              <ChevronRight size={20} />
            </button>
          </div>
        ) : preview ? (
          // Preview mode - confirm/retake
          <div className="flex items-center gap-4">
            <button
              onClick={() => setPreview(null)}
              className="flex-1 bg-dark-100 hover:bg-dark-100/80 active:scale-[0.98] text-gray-300 font-semibold py-4 rounded-full transition-all"
            >
              Retake
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 bg-primary hover:bg-primary/90 active:scale-[0.98] text-dark-300 font-semibold py-4 rounded-full transition-all"
            >
              Use Photo
            </button>
          </div>
        ) : (
          // Camera mode controls
          <div className="flex items-center justify-between">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
            <input
              ref={multiFileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleMultiFileSelect}
              className="hidden"
            />
            
            {/* Gallery button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-14 h-14 rounded-xl bg-dark-100/50 backdrop-blur hover:bg-dark-100 active:scale-95 transition-all flex items-center justify-center"
            >
              <ImageIcon size={24} className="text-gray-400" />
            </button>

            {/* Capture button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-full bg-primary hover:bg-primary/90 transition-colors flex items-center justify-center active:scale-95 shadow-lg shadow-primary/50"
            >
              <div className="w-16 h-16 rounded-full border-4 border-dark-300" />
            </button>

            {/* Receipt history button */}
            <button
              onClick={() => multiFileInputRef.current?.click()}
              className="w-14 h-14 rounded-xl bg-dark-100/50 backdrop-blur hover:bg-dark-100 active:scale-95 transition-all flex items-center justify-center"
            >
              <Receipt size={24} className="text-gray-400" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
