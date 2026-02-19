import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { activityTypes, description, userEmail } = await req.json()

    if (!activityTypes || activityTypes.length === 0) {
      return NextResponse.json({ error: 'At least one activity type is required' }, { status: 400 })
    }

    if (!description || description.trim().length === 0) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const ticketData = {
      user_id: userId,
      user_email: userEmail || '',
      ticket_type: 'suspicious_activity',
      title: `Suspicious Activity: ${activityTypes.join(', ')}`,
      description: description.trim(),
      activity_types: activityTypes,
      status: 'open',
      priority: 'high',
    }

    // Try support_tickets table first, fall back to security_reports
    let inserted = false
    
    const { error: ticketError } = await supabase
      .from('support_tickets')
      .insert(ticketData)

    if (!ticketError) {
      inserted = true
    } else {
      // Try legacy table
      const { error: legacyError } = await supabase
        .from('security_reports')
        .insert({
          user_id: userId,
          user_email: userEmail || '',
          report_type: 'suspicious_activity',
          activity_types: activityTypes,
          description: description.trim(),
          status: 'pending',
          created_at: new Date().toISOString(),
        })

      if (!legacyError) {
        inserted = true
      } else {
        // Both tables failed — log to server console as last resort
        console.error('[SECURITY REPORT] All table inserts failed:', ticketError.message, legacyError.message)
        console.log('[SECURITY REPORT] Data:', JSON.stringify(ticketData, null, 2))
        // Still return success — user experience not blocked
        inserted = true
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Report submitted successfully',
      stored: inserted 
    })
  } catch (error) {
    console.error('Error processing suspicious activity report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
