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

    // Use service role to insert into security_reports table (or log to console for now)
    // For MVP, we log and store the report so the team can review
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Try to insert into a reports table. If it doesn't exist, fall back to logging.
    const reportData = {
      user_id: userId,
      user_email: userEmail || '',
      report_type: 'suspicious_activity',
      activity_types: activityTypes,
      description: description.trim(),
      status: 'pending',
      created_at: new Date().toISOString(),
    }

    const { error: insertError } = await supabase
      .from('security_reports')
      .insert(reportData)

    if (insertError) {
      // Table might not exist yet — log the report so it's not lost
      console.warn('[SECURITY REPORT] Table insert failed, logging report:', insertError.message)
      console.log('[SECURITY REPORT]', JSON.stringify(reportData, null, 2))
    }

    return NextResponse.json({ success: true, message: 'Report submitted successfully' })
  } catch (error) {
    console.error('Error processing suspicious activity report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
