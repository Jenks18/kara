import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAndExtractUser } from '@/lib/auth/mobile-auth'
import { rateLimit } from '@/lib/auth/rate-limit'

const MAX_TITLE_LENGTH = 200
const MAX_DESCRIPTION_LENGTH = 5000
const MAX_STEPS_LENGTH = 3000

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

    // 3. Rate limit: 10 bug reports per minute per user/IP
    const limited = rateLimit(req, userId, { limit: 10, windowMs: 60_000 })
    if (limited) return limited

    const { category, severity, title, description, stepsToReproduce, userEmail, userAgent, screenSize, userId: bodyUserId, platform } = await req.json()
    
    // Fall back to body userId for unauthenticated ticket creation (low risk)
    const resolvedUserId = userId || bodyUserId || 'anonymous'

    if (!category) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 })
    }
    if (!title || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }
    if (!description || description.trim().length === 0) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 })
    }

    // Input length limits
    const sanitizedTitle = title.trim().slice(0, MAX_TITLE_LENGTH)
    const sanitizedDescription = description.trim().slice(0, MAX_DESCRIPTION_LENGTH)
    const sanitizedSteps = stepsToReproduce?.trim()?.slice(0, MAX_STEPS_LENGTH) || null

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const ticketData = {
      user_id: resolvedUserId,
      user_email: userEmail || '',
      ticket_type: 'bug' as const,
      category,
      severity: severity || 'medium',
      title: sanitizedTitle,
      description: sanitizedDescription,
      steps_to_reproduce: sanitizedSteps,
      user_agent: userAgent || null,
      screen_size: screenSize || null,
      status: 'open' as const,
      priority: severity === 'high' ? 'high' : severity === 'low' ? 'low' : 'medium',
      metadata: platform ? { platform } : {},
    }

    const { error: ticketError } = await supabase
      .from('support_tickets')
      .insert(ticketData)

    if (ticketError) {
      console.error('[BUG REPORT] Insert failed:', ticketError.message)
      console.log('[BUG REPORT] Data:', JSON.stringify(ticketData, null, 2))
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Bug report submitted successfully',
      stored: !ticketError 
    })
  } catch (error) {
    console.error('Error processing bug report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
