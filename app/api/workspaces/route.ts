import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getWorkspaces, createWorkspace } from '@/lib/api/workspaces'

// GET /api/workspaces - Get all workspaces for the current user
// By default, excludes the default (personal) workspace from the list.
// Pass ?include_default=true to include it.
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const includeDefault = request.nextUrl.searchParams.get('include_default') === 'true'

    const workspaces = await getWorkspaces(userId)

    // Filter out the default workspace unless explicitly requested.
    // This lets the workspace management page show an "empty" state
    // so users learn to create workspaces, while the default workspace
    // still silently receives receipts/expenses.
    const filtered = includeDefault
      ? workspaces
      : workspaces.filter(ws => !ws.is_default)

    return NextResponse.json({ workspaces: filtered })
  } catch (error: any) {
    console.error('Error fetching workspaces:', error instanceof Error ? error.message : String(error))
    
    // If it's a RLS policy error mentioning workspace_members, return empty array
    if (error.message?.includes('workspace_members') || error.code === 'PGRST116' || error.code === '42P01') {
      console.warn('workspace_members table not found - migration 011 needs to be applied. Returning empty workspaces.')
      return NextResponse.json({ workspaces: [], warning: 'Workspace collaboration migration pending' })
    }
    
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
    console.error('Error creating workspace:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: error.message || 'Failed to create workspace' },
      { status: 500 }
    )
  }
}
