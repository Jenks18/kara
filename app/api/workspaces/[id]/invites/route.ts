import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase/server-client'
import { clerkClient } from '@clerk/nextjs/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/workspaces/[id]/invites
 * List all pending invites for a workspace (admin only)
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: workspaceId } = await context.params
    const supabase = await createServerClient()

    // Check if user is an admin of this workspace
    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (membershipError || !membership || membership.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can view invites' }, { status: 403 })
    }

    // Get all pending invites
    const { data: invites, error } = await supabase
      .from('workspace_invites')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching invites:', error)
      return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 })
    }

    return NextResponse.json({ invites })
  } catch (error) {
    console.error('Error in GET /api/workspaces/[id]/invites:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/workspaces/[id]/invites
 * Create an invite link for workspace (admin only)
 * Body: { email: string, role?: 'admin' | 'member' | 'viewer', message?: string }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: workspaceId } = await context.params
    const body = await request.json()
    const { email, role = 'member', message } = body

    if (!email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 })
    }

    if (!['admin', 'member', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const supabase = await createServerClient()

    // Check if user is an admin of this workspace
    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (membershipError || !membership || membership.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can create invites' }, { status: 403 })
    }

    // Get workspace info for metadata
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('name, owner_id')
      .eq('id', workspaceId)
      .single()

    // Get inviter profile
    const { data: inviterProfile } = await supabase
      .from('user_profiles')
      .select('display_name, first_name, last_name, email')
      .eq('user_id', userId)
      .single()

    const inviterName = inviterProfile?.display_name || 
                        (inviterProfile?.first_name && inviterProfile?.last_name 
                          ? `${inviterProfile.first_name} ${inviterProfile.last_name}` 
                          : inviterProfile?.email || 'A team member')

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('workspace_members')
      .select('id, status')
      .eq('workspace_id', workspaceId)
      .eq('user_id', email) // Assuming email = user_id for now
      .single()

    if (existingMember?.status === 'active') {
      return NextResponse.json({ error: 'User is already a member' }, { status: 400 })
    }

    // Check if there's already a pending invite
    const { data: existingInvite } = await supabase
      .from('workspace_invites')
      .select('id, token')
      .eq('workspace_id', workspaceId)
      .eq('email', email)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single()

    if (existingInvite) {
      // Return existing invite
      const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://mafutapass.com'}/invites/accept/${existingInvite.token}`
      return NextResponse.json({ 
        invite: existingInvite,
        inviteUrl,
        message: 'Invite already exists'
      })
    }

    // Create new invite
    const { data: invite, error: insertError } = await supabase
      .from('workspace_invites')
      .insert({
        workspace_id: workspaceId,
        email,
        role,
        invited_by: userId,
        message,
        metadata: {
          workspace_name: workspace?.name,
          inviter_name: inviterName,
        },
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating invite:', insertError)
      return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
    }

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://mafutapass.com'}/invites/accept/${invite.token}`

    // TODO: Send email notification (integrate with SendGrid, Resend, etc.)
    // await sendInviteEmail({ email, inviteUrl, workspaceName: workspace?.name, inviterName })

    return NextResponse.json({ 
      invite,
      inviteUrl,
      message: 'Invite created successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/workspaces/[id]/invites:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/workspaces/[id]/invites/[inviteId]
 * Cancel an invite (admin only)
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: workspaceId } = await context.params
    const { searchParams } = new URL(request.url)
    const inviteId = searchParams.get('inviteId')

    if (!inviteId) {
      return NextResponse.json({ error: 'inviteId is required' }, { status: 400 })
    }

    const supabase = await createServerClient()

    // Check if user is an admin of this workspace
    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (membershipError || !membership || membership.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can cancel invites' }, { status: 403 })
    }

    // Cancel the invite
    const { error: updateError } = await supabase
      .from('workspace_invites')
      .update({ status: 'cancelled' })
      .eq('id', inviteId)
      .eq('workspace_id', workspaceId)

    if (updateError) {
      console.error('Error cancelling invite:', updateError)
      return NextResponse.json({ error: 'Failed to cancel invite' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in PATCH /api/workspaces/[id]/invites:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
