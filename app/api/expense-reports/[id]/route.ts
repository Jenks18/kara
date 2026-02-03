import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getExpenseReport, updateReportStatus, deleteExpenseReport } from '@/lib/api/expense-reports'
import { createServerClient } from '@/lib/supabase/server-client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const supabase = await createServerClient()
    const report = await getExpenseReport(id, supabase)

    // RLS handles user filtering automatically via Clerk JWT
    if (!report) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(report)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const supabase = await createServerClient()
    
    // RLS handles user filtering automatically via Clerk JWT
    const report = await getExpenseReport(id, supabase)
    if (!report) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const result = await updateReportStatus(id, body.status, supabase)

    if (result.success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const supabase = await createServerClient()
    
    // RLS handles user filtering automatically via Clerk JWT
    const report = await getExpenseReport(id, supabase)
    if (!report) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      )
    }

    const result = await deleteExpenseReport(id, supabase)

    if (result.success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
