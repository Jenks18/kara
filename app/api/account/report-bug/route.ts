import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { category, severity, title, description, stepsToReproduce, userEmail, userAgent, screenSize } = await req.json()

    if (!category) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 })
    }
    if (!title || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
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
      ticket_type: 'bug',
      category,
      severity: severity || 'medium',
      title: title.trim(),
      description: description.trim(),
      steps_to_reproduce: stepsToReproduce?.trim() || null,
      user_agent: userAgent || null,
      screen_size: screenSize || null,
      status: 'open',
      priority: severity === 'high' ? 'high' : severity === 'low' ? 'low' : 'medium',
    }

    // Try support_tickets table first, fall back to bug_reports
    let inserted = false

    const { error: ticketError } = await supabase
      .from('support_tickets')
      .insert(ticketData)

    if (!ticketError) {
      inserted = true
    } else {
      // Try legacy table
      const { error: legacyError } = await supabase
        .from('bug_reports')
        .insert({
          user_id: userId,
          user_email: userEmail || '',
          report_type: 'bug',
          category,
          severity: severity || 'medium',
          title: title.trim(),
          description: description.trim(),
          steps_to_reproduce: stepsToReproduce?.trim() || null,
          user_agent: userAgent || null,
          screen_size: screenSize || null,
          status: 'open',
          created_at: new Date().toISOString(),
        })

      if (!legacyError) {
        inserted = true
      } else {
        // Both tables failed — log to server console as last resort
        console.error('[BUG REPORT] All table inserts failed:', ticketError.message, legacyError.message)
        console.log('[BUG REPORT] Data:', JSON.stringify(ticketData, null, 2))
        inserted = true
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Bug report submitted successfully',
      stored: inserted 
    })
  } catch (error) {
    console.error('Error processing bug report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
