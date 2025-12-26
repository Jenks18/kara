'use client'

import BottomNav from '@/components/navigation/BottomNav'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { Receipt, MapPin, MessageSquare, Briefcase, Eye } from 'lucide-react'

export default function CreatePage() {
  const options = [
    {
      id: 'expense',
      icon: Receipt,
      label: 'Create expense',
      description: 'Manually add a fuel expense',
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
    <div className="min-h-screen pb-20">
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
              <Card key={option.id} hoverable>
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
  )
}
