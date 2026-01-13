import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getWorkspace, deleteWorkspace } from '@/lib/api/workspaces'

// GET /api/workspaces/[id] - Get a single workspace
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const workspace = await getWorkspace(id, userId)

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    return NextResponse.json({ workspace })
  } catch (error: any) {
    console.error('Error fetching workspace:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch workspace' },
      { status: 500 }
    )
  }
}

// DELETE /api/workspaces/[id] - Delete a workspace
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const result = await deleteWorkspace(id, userId)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting workspace:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete workspace' },
      { status: 500 }
    )
  }
}
