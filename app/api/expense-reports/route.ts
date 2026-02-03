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
    const reports = await getExpenseReports(userId, 50, supabase)
    return NextResponse.json(reports)
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
