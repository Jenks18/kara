'use client'

import { useState } from 'react'
import BottomNav from '@/components/navigation/BottomNav'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import ReceiptCapture from '@/components/receipt/ReceiptCapture'
import ReceiptProcessingStatus from '@/components/receipt/ReceiptProcessingStatus'
import ReceiptReviewModal from '@/components/receipt/ReceiptReviewModal'
import { Receipt, MapPin, MessageSquare, Eye, Briefcase } from 'lucide-react'

export default function CreatePage() {
  const [showCapture, setShowCapture] = useState(false)
  const [showProcessing, setShowProcessing] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [processingStatus, setProcessingStatus] = useState<'uploading' | 'processing' | 'verified' | 'needs_review'>('uploading')
  const [progress, setProgress] = useState(0)
  
  const handleCaptureReceipt = async (imageData: string) => {
    setShowCapture(false)
    setShowProcessing(true)
    setProcessingStatus('uploading')
    setProgress(10)
    
    try {
      // Convert base64 to blob
      const base64Response = await fetch(imageData)
      const blob = await base64Response.blob()
      
      // Create form data
      const formData = new FormData()
      formData.append('image', blob, 'receipt.jpg')
      
      setProgress(20)
      
      // Upload to API
      const response = await fetch('/api/receipts/upload', {
        method: 'POST',
        body: formData,
      })
      
      setProgress(40)
      setProcessingStatus('processing')
      
      const result = await response.json()
      
      setProgress(100)
      
      if (!response.ok) {
        alert(`Error: ${result.message || result.error}`)
        setShowProcessing(false)
        return
      }
      
      // Check if needs review
      if (result.transaction.status === 'needs_review') {
        setProcessingStatus('needs_review')
      } else {
        setProcessingStatus('verified')
        setTimeout(() => {
          setShowProcessing(false)
          alert(`✓ Receipt verified!\n${result.transaction.litres}L ${result.transaction.fuelType} @ ${result.transaction.pricePerLitre?.toFixed(2)} KES/L`)
        }, 2000)
      }
      
    } catch (error: any) {
      console.error('Upload failed:', error)
      alert('Failed to process receipt: ' + error.message)
      setShowProcessing(false)
    }
  }
  
  const handleReviewSubmit = (data: any) => {
    setShowReview(false)
    setShowProcessing(false)
    // Would save the completed transaction
    console.log('Review submitted:', data)
  }
  const options = [
    {
      id: 'expense',
      icon: Receipt,
      label: 'Scan Receipt',
      description: 'Capture fuel receipt with camera',
      action: () => setShowCapture(true),
    },
    {
      id: 'distance',
      icon: MapPin,
      label: 'Track distance',
      description: 'Log mileage for reimbursement',
    },
    {
      id: 'chat',
      icon: MessageSquare,
      label: 'Start chat',
      description: 'Message your manager or team',
    },
    {
      id: 'testdrive',
      icon: Eye,
      label: 'Take a 2-minute test drive',
      description: 'Learn how to use Kara',
    },
    {
      id: 'workspace',
      icon: Briefcase,
      label: 'New workspace',
      description: 'Get the Kara Card and more',
    },
  ]
  
  return (
    <>
      <div className="min-h-screen pb-20" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
        {/* Header */}
        <div className="sticky top-0 z-30 bg-dark-200/95 backdrop-blur-lg border-b border-gray-800">
          <div className="px-4 py-4 max-w-md mx-auto">
            <h1 className="text-2xl font-bold text-gray-100">Create</h1>
          </div>
        </div>
        
        {/* Content */}
        <div className="px-4 py-6 max-w-md mx-auto">
          {/* Processing Status */}
          {showProcessing && (
            <ReceiptProcessingStatus
              status={processingStatus}
              progress={progress}
              onReview={() => setShowReview(true)}
            />
          )}
          
          <div className="space-y-3">
            {options.map((option) => {
              const Icon = option.icon
              return (
                <Card 
                  key={option.id} 
                  hoverable
                  onClick={option.action}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="text-primary-400" size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-100">{option.label}</h3>
                      <p className="text-sm text-gray-400 mt-0.5">{option.description}</p>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
        
        <BottomNav />
      </div>
      
      {/* Receipt Capture Modal */}
      {showCapture && (
        <ReceiptCapture
          onCapture={handleCaptureReceipt}
          onCancel={() => setShowCapture(false)}
        />
      )}
      
      {/* Review Modal */}
      {showReview && (
        <ReceiptReviewModal
          receiptData={{
            imageUrl: '/receipt-preview.jpg',
            merchant: 'Mascot Petroleum',
            totalAmount: 5700,
            date: 'Dec 20, 2025',
            missingFields: ['litres', 'fuelType'],
          }}
          onSubmit={handleReviewSubmit}
          onCancel={() => setShowReview(false)}
        />
      )}
    </>
  )
}
