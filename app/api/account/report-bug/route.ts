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

    const reportData = {
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
    }

    const { error: insertError } = await supabase
      .from('bug_reports')
      .insert(reportData)

    if (insertError) {
      // Table might not exist yet — log the report so it's not lost
      console.warn('[BUG REPORT] Table insert failed, logging report:', insertError.message)
      console.log('[BUG REPORT]', JSON.stringify(reportData, null, 2))
    }

    return NextResponse.json({ success: true, message: 'Bug report submitted successfully' })
  } catch (error) {
    console.error('Error processing bug report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
