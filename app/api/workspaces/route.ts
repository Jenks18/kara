import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getWorkspaces, createWorkspace } from '@/lib/api/workspaces'

// GET /api/workspaces - Get all workspaces for the current user
export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaces = await getWorkspaces(userId)
    return NextResponse.json({ workspaces })
  } catch (error: any) {
    console.error('Error fetching workspaces:', error?.message || error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch workspaces' },
      { status: 500 }
    )
  }
}

// POST /api/workspaces - Create a new workspace
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, avatar, currency, currencySymbol } = body

    if (!name) {
      return NextResponse.json({ error: 'Workspace name is required' }, { status: 400 })
    }

    const result = await createWorkspace({
      userId,
      name,
      avatar,
      currency,
      currencySymbol
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ workspace: result.workspace })
  } catch (error: any) {
    console.error('Error creating workspace:', error?.message || error)
    return NextResponse.json(
      { error: error.message || 'Failed to create workspace' },
      { status: 500 }
    )
  }
}
