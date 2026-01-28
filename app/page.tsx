import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import BottomNav from '@/components/navigation/BottomNav'
import FAB from '@/components/ui/FAB'
import { Search, Pin } from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server-client'
import Link from 'next/link'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface ConversationThread {
  id: string
  type: 'workspace' | 'report' | 'dm' | 'system'
  title: string
  subtitle: string
  avatar: string
  timestamp: string
  isPinned?: boolean
  hasUnread?: boolean
  workspaceId?: string
  reportId?: string
}

export default async function HomePage() {
  // Get authenticated user
  const { userId } = await auth()
  const user = await currentUser()
  
  // Redirect if not authenticated or missing email
  if (!userId || !user?.emailAddresses?.[0]?.emailAddress) {
    redirect('/sign-in')
  }
  
  // Create Supabase client with Clerk JWT
  const supabase = await createServerClient()
  
  // Fetch expense reports for conversation threads
  const { data: reports } = await supabase
    .from('expense_reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  // Build conversation threads
  const conversations: ConversationThread[] = []
  
  // Add workspace channel threads
  conversations.push({
    id: 'workspace-admins-1',
    type: 'workspace',
    title: '#admins',
    subtitle: "Terpmail's Workspace 1 • Concierge: I'm here to ...",
    avatar: 'T',
    timestamp: 'Yesterday',
    isPinned: true,
    hasUnread: false,
  })
  
  conversations.push({
    id: 'workspace-admins-2',
    type: 'workspace',
    title: '#admins',
    subtitle: "Terpmail's Workspace • Concierge: Your free tria...",
    avatar: 'T',
    timestamp: '2d ago',
    isPinned: false,
    hasUnread: true,
  })
  
  // Add system message thread
  conversations.push({
    id: 'concierge',
    type: 'system',
    title: 'Concierge',
    subtitle: "Hi there! I'm sorry to hear you aren't fully satisfie...",
    avatar: '🤖',
    timestamp: '3d ago',
    isPinned: true,
    hasUnread: false,
  })
  
  // Add report threads
  if (reports) {
    for (const report of reports.slice(0, 2)) {
      conversations.push({
        id: report.id,
        type: 'report',
        title: "Ian Njenga's expenses",
        subtitle: `${report.workspace_name} • ${report.title}`,
        avatar: 'T',
        timestamp: new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        hasUnread: true,
        reportId: report.id,
      })
    }
  }
  
  // Add DM thread
  conversations.push({
    id: 'dm-foronjenga',
    type: 'dm',
    title: 'foronjenga19@gmail.com',
    subtitle: 'You: Hjm',
    avatar: '👤',
    timestamp: 'Today',
    hasUnread: false,
  })
  
  // Add older report thread
  conversations.push({
    id: 'report-old',
    type: 'report',
    title: "Ian Njenga's expenses",
    subtitle: "Terpmail's Workspace 1 • This is where Ian Njenga wi...",
    avatar: 'T',
    timestamp: 'Jan 20',
    hasUnread: false,
  })
  
  conversations.push({
    id: 'report-old-2',
    type: 'report',
    title: 'Expense Report 2025-12-20',
    subtitle: 'You: Travel',
    avatar: '💰',
    timestamp: 'Dec 20',
    hasUnread: false,
  })
  
  conversations.push({
    id: 'manager-mctest',
    type: 'dm',
    title: 'Manager McTest',
    subtitle: 'Thanks for sending me that test expense! Next, try su...',
    avatar: '👨‍💼',
    timestamp: 'Dec 15',
    hasUnread: false,
  })
  
  return (
    <div className="min-h-screen pb-20 bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-emerald-200">
        <div className="px-4 py-4 max-w-md mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
            <button className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center active:bg-emerald-100 rounded-full transition-colors touch-manipulation">
              <Search size={24} className="text-gray-600" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Conversation Threads */}
      <div className="max-w-md mx-auto">
        {conversations.map((thread) => (
          <Link
            key={thread.id}
            href={thread.reportId ? `/reports/${thread.reportId}` : `/inbox/${thread.id}`}
            className="block border-b border-emerald-100 hover:bg-white/50 transition-colors"
          >
            <div className="px-4 py-3 flex items-center gap-3">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold ${
                  thread.type === 'workspace' ? 'bg-gradient-to-br from-blue-600 to-blue-700' :
                  thread.type === 'report' ? 'bg-gradient-to-br from-emerald-600 to-emerald-700' :
                  thread.type === 'system' ? 'bg-gradient-to-br from-emerald-500 to-green-600' :
                  'bg-gradient-to-br from-red-600 to-red-700'
                }`}>
                  {thread.avatar.length === 1 && thread.avatar.match(/[A-Z]/) ? (
                    <span className="text-lg">{thread.avatar}</span>
                  ) : (
                    <span className="text-2xl">{thread.avatar}</span>
                  )}
                </div>
                {thread.type === 'report' && (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center border-2 border-white">
                    <span className="text-xs">💰</span>
                  </div>
                )}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 truncate">{thread.title}</h3>
                  {thread.isPinned && (
                    <Pin size={14} className="text-gray-500 flex-shrink-0" />
                  )}
                </div>
                <p className="text-sm text-gray-600 truncate mt-0.5">{thread.subtitle}</p>
              </div>
              
              {/* Timestamp and Badge */}
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="text-xs text-gray-500">{thread.timestamp}</span>
                {thread.hasUnread && (
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
      
      <FAB />
      <BottomNav />
    </div>
  )
}
