'use client'

import { useState } from 'react'
import BottomNav from '@/components/navigation/BottomNav'
import Card from '@/components/ui/Card'
import ReceiptCapture from '@/components/receipt/ReceiptCapture'
import { Receipt, MapPin, MessageSquare, Eye, Briefcase } from 'lucide-react'

export default function CreatePage() {
  const [showCapture, setShowCapture] = useState(false)
  
  // ReceiptCapture component now handles the entire workflow:
  // capture → confirm → save to DB → show report view
  // No need for separate processing/review state here
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
      
      {/* Receipt Capture Modal - handles entire flow internally */}
      {showCapture && (
        <ReceiptCapture
          onCapture={() => {}} // Not used - component handles everything
          onCancel={() => setShowCapture(false)}
        />
      )}
    </>
  )
}
