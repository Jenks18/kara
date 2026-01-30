'use client'

import { useState } from 'react'
import BottomNav from '@/components/navigation/BottomNav'
import Card from '@/components/ui/Card'
import ReceiptCapture from '@/components/receipt/ReceiptCapture'
import { Receipt, MessageSquare, FileText } from 'lucide-react'

// Force dynamic rendering to avoid Clerk prerender issues
export const dynamic = 'force-dynamic'

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
      id: 'chat',
      icon: MessageSquare,
      label: 'Start chat',
      description: 'Message your manager or team',
    },
    {
      id: 'report',
      icon: FileText,
      label: 'Create report',
      description: 'Create a new expense report',
    },
  ]
  
  return (
    <>
      {/* No header - start directly with content */}
      <div className="min-h-screen pb-20 bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
        {/* Cards start from top with padding */}
        <div className="px-4 pt-6 pb-6 max-w-md mx-auto">
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
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Icon className="text-emerald-600" size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{option.label}</h3>
                      <p className="text-sm text-gray-600 mt-0.5">{option.description}</p>
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
