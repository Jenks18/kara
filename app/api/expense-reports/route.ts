import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createExpenseReport, getExpenseReports, type ExpenseReportInput } from '@/lib/api/expense-reports'
import { createServerClient } from '@/lib/supabase/server-client'

export async function GET(request: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const supabase = await createServerClient()
    // Use a joined query to avoid N+1 — RLS handles user filtering
    const { data: reports, error } = await supabase
      .from('expense_reports')
      .select('*, expense_items(*)')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error fetching reports:', error)
      return NextResponse.json([], { status: 200 })
    }

    // Map to expected shape
    const mapped = (reports || []).map((r: any) => ({
      ...r,
      items: r.expense_items || [],
    }))
    return NextResponse.json(mapped)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const { userId, sessionClaims } = await auth()

  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const supabase = await createServerClient()
    const body = await request.json()
    
    // Add userId and userEmail from Clerk
    const reportData: ExpenseReportInput = {
      userId,
      userEmail: sessionClaims?.email || body.userEmail,
      workspaceName: body.workspaceName,
      workspaceAvatar: body.workspaceAvatar,
      title: body.title,
      items: body.items,
    }

    const result = await createExpenseReport(reportData, supabase)

    if (result.success) {
      return NextResponse.json(
        { reportId: result.reportId },
        { status: 201 }
      )
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
