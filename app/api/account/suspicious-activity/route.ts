import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAndExtractUser } from '@/lib/auth/mobile-auth'
import { rateLimit } from '@/lib/auth/rate-limit'

const MAX_DESCRIPTION_LENGTH = 5000

export async function POST(req: NextRequest) {
  try {
    // 1. Try Clerk session auth (webapp cookies)
    let userId: string | null = null
    try {
      const authResult = await auth()
      userId = authResult.userId
    } catch {}

    // 2. Try verified mobile JWT (Authorization: Bearer <token>)
    if (!userId) {
      const mobileUser = await verifyAndExtractUser(req)
      if (mobileUser) {
        userId = mobileUser.userId
      }
    }

    // 3. Rate limit: 5 suspicious activity reports per minute per user/IP
    const limited = rateLimit(req, userId, { limit: 5, windowMs: 60_000 })
    if (limited) return limited

    const { activityTypes, description, userEmail, userId: bodyUserId, platform } = await req.json()
    
    // Fall back to body userId for unauthenticated ticket creation (low risk)
    const resolvedUserId = userId || bodyUserId || 'anonymous'

    if (!activityTypes || activityTypes.length === 0) {
      return NextResponse.json({ error: 'At least one activity type is required' }, { status: 400 })
    }

    if (!description || description.trim().length === 0) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 })
    }

    const sanitizedDescription = description.trim().slice(0, MAX_DESCRIPTION_LENGTH)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const ticketData = {
      user_id: resolvedUserId,
      user_email: userEmail || '',
      ticket_type: 'suspicious_activity' as const,
      title: `Suspicious Activity: ${activityTypes.join(', ')}`,
      description: sanitizedDescription,
      activity_types: activityTypes,
      status: 'open' as const,
      priority: 'high' as const,
      metadata: platform ? { platform } : {},
    }

    const { error: ticketError } = await supabase
      .from('support_tickets')
      .insert(ticketData)

    if (ticketError) {
      console.error('[SECURITY REPORT] Insert failed:', ticketError.message)
      console.log('[SECURITY REPORT] Data:', JSON.stringify(ticketData, null, 2))
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Report submitted successfully',
      stored: !ticketError 
    })
  } catch (error) {
    console.error('Error processing suspicious activity report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
