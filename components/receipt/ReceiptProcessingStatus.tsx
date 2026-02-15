'use client'

import { Check, Clock, AlertCircle, Edit2, QrCode, Fuel } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

interface ProcessingStatusProps {
  status: 'uploading' | 'processing' | 'verified' | 'needs_review'
  progress?: number
  onReview?: () => void
}

export default function ReceiptProcessingStatus({ 
  status, 
  progress = 0,
  onReview 
}: ProcessingStatusProps) {
  
  const statusConfig = {
    uploading: {
      icon: Clock,
      color: 'text-primary-400',
      bgColor: 'bg-primary-500/10',
      title: 'Uploading Receipt',
      message: 'Securing your receipt image...',
      showProgress: true,
    },
    processing: {
      icon: Clock,
      color: 'text-warning-500',
      bgColor: 'bg-warning-500/10',
      title: 'Processing Receipt',
      message: 'Reading QR code and extracting fuel data...',
      showProgress: true,
    },
    verified: {
      icon: Check,
      color: 'text-success-500',
      bgColor: 'bg-success-500/10',
      title: 'Receipt Verified!',
      message: 'All data extracted successfully',
      showProgress: false,
    },
    needs_review: {
      icon: AlertCircle,
      color: 'text-warning-500',
      bgColor: 'bg-warning-500/10',
      title: 'Action Required',
      message: 'We need a bit more information',
      showProgress: false,
    },
  }
  
  const config = statusConfig[status]
  const Icon = config.icon
  
  return (
    <Card className="mb-6">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`w-12 h-12 rounded-xl ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
          {status === 'processing' ? (
            <div className="w-6 h-6 border-3 border-warning-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Icon className={config.color} size={24} />
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 mb-1">{config.title}</h3>
          <p className="text-sm text-gray-500 mb-3">{config.message}</p>
          
          {/* Progress Bar */}
          {config.showProgress && (
            <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
              <div
                className="bg-primary-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          
          {/* Processing Steps */}
          {status === 'processing' && (
            <div className="space-y-2 mt-3">
              <ProcessingStep 
                icon={QrCode} 
                label="Scanning QR Code" 
                status={progress > 30 ? 'complete' : 'active'} 
              />
              <ProcessingStep 
                icon={Fuel} 
                label="Extracting Fuel Data" 
                status={progress > 70 ? 'complete' : progress > 30 ? 'active' : 'pending'} 
              />
              <ProcessingStep 
                icon={Check} 
                label="Validating Information" 
                status={progress > 90 ? 'complete' : progress > 70 ? 'active' : 'pending'} 
              />
            </div>
          )}
          
          {/* Review Button */}
          {status === 'needs_review' && onReview && (
            <Button variant="primary" size="sm" onClick={onReview} className="mt-2">
              <Edit2 size={16} className="mr-2" />
              Review & Complete
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

function ProcessingStep({ 
  icon: Icon, 
  label, 
  status 
}: { 
  icon: any
  label: string
  status: 'pending' | 'active' | 'complete'
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`
        w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0
        ${status === 'complete' ? 'bg-success-500' : status === 'active' ? 'bg-primary-500' : 'bg-gray-300'}
      `}>
        {status === 'complete' ? (
          <Check size={12} className="text-white" />
        ) : status === 'active' ? (
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
        ) : (
          <Icon size={12} className="text-gray-500" />
        )}
      </div>
      <span className={`text-sm ${status === 'pending' ? 'text-gray-400' : 'text-gray-700'}`}>
        {label}
      </span>
    </div>
  )
}
