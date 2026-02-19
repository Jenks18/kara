import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase/server-client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/invites/accept/[token]
 * View invite details (public, no auth required)
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params
    const supabase = await createServerClient()

    // Get invite details
    const { data: invite, error } = await supabase
      .from('workspace_invites')
      .select(`
        id,
        workspace_id,
        email,
        role,
        status,
        expires_at,
        message,
        metadata,
        created_at
      `)
      .eq('token', token)
      .single()

    if (error || !invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    // Check if invite is still valid
    if (invite.status !== 'pending') {
      return NextResponse.json({ 
        error: 'Invite has already been used or cancelled',
        status: invite.status 
      }, { status: 400 })
    }

    if (new Date(invite.expires_at) < new Date()) {
      // Mark as expired
      await supabase
        .from('workspace_invites')
        .update({ status: 'expired' })
        .eq('id', invite.id)

      return NextResponse.json({ error: 'Invite has expired' }, { status: 400 })
    }

    // Get workspace info
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id, name, avatar, member_count')
      .eq('id', invite.workspace_id)
      .single()

    return NextResponse.json({
      invite: {
        id: invite.id,
        workspaceId: invite.workspace_id,
        workspaceName: workspace?.name || 'Unknown Workspace',
        workspaceAvatar: workspace?.avatar,
        memberCount: workspace?.member_count || 0,
        email: invite.email,
        role: invite.role,
        message: invite.message,
        inviterName: invite.metadata?.inviter_name || 'A team member',
        createdAt: invite.created_at,
        expiresAt: invite.expires_at,
      }
    })
  } catch (error) {
    console.error('Error in GET /api/invites/accept/[token]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/invites/accept/[token]
 * Accept an invite and join workspace (requires auth)
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - please sign in' }, { status: 401 })
    }

    const { token } = await context.params
    const supabase = await createServerClient()

    // Get user's email from profile
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('user_id', userId)
      .single()

    if (!userProfile?.email) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Get invite
    const { data: invite, error: inviteError } = await supabase
      .from('workspace_invites')
      .select('*')
      .eq('token', token)
      .single()

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    // Token-based auth: anyone with a valid invite link can accept.
    // This supports SMS invites where the stored contact may be a phone number.

    // Check if invite is still valid
    if (invite.status !== 'pending') {
      return NextResponse.json({ 
        error: 'Invite has already been used or cancelled',
        status: invite.status 
      }, { status: 400 })
    }

    if (new Date(invite.expires_at) < new Date()) {
      await supabase
        .from('workspace_invites')
        .update({ status: 'expired' })
        .eq('id', invite.id)

      return NextResponse.json({ error: 'Invite has expired' }, { status: 400 })
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('workspace_members')
      .select('id, status')
      .eq('workspace_id', invite.workspace_id)
      .eq('user_id', userId)
      .single()

    if (existingMember?.status === 'active') {
      // Mark invite as accepted
      await supabase
        .from('workspace_invites')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          accepted_by_user_id: userId 
        })
        .eq('id', invite.id)

      return NextResponse.json({ 
        message: 'You are already a member of this workspace',
        workspaceId: invite.workspace_id
      })
    }

    // Add user to workspace
    const permissions = invite.role === 'admin'
      ? { can_view: true, can_edit: true, can_delete: true, can_invite: true, can_manage_members: true }
      : invite.role === 'member'
      ? { can_view: true, can_edit: true, can_delete: false, can_invite: false }
      : { can_view: true, can_edit: false, can_delete: false, can_invite: false }

    const { data: newMember, error: memberError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: invite.workspace_id,
        user_id: userId,
        role: invite.role,
        invited_by: invite.invited_by,
        permissions,
      })
      .select()
      .single()

    if (memberError) {
      console.error('Error adding member:', memberError)
      return NextResponse.json({ error: 'Failed to join workspace' }, { status: 500 })
    }

    // Mark invite as accepted
    const { error: updateError } = await supabase
      .from('workspace_invites')
      .update({ 
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by_user_id: userId 
      })
      .eq('id', invite.id)

    if (updateError) {
      console.error('Error updating invite:', updateError)
      // Non-critical error, don't fail the request
    }

    return NextResponse.json({ 
      success: true,
      message: 'Successfully joined workspace',
      workspaceId: invite.workspace_id,
      member: newMember
    }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/invites/accept/[token]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
