import { NextRequest, NextResponse } from 'next/server'
import { corsHeaders, validateMobileToken } from '@/lib/auth/mobile-auth'
import { createMobileClient } from '@/lib/supabase/mobile-client'

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders })
}

/**
 * POST /api/mobile/workspaces/[id]/invites
 * Create an invite link for a workspace (admin only).
 * Mobile-auth version of /api/workspaces/[id]/invites.
 *
 * Body: { contact: string, role?: 'admin' | 'member' | 'viewer' }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await validateMobileToken(request)
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      )
    }

    const { id: workspaceId } = await context.params
    const client = await createMobileClient(request)
    if (!client) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      )
    }

    const { supabase } = client

    const body = await request.json()
    const contact = body.contact || body.email || 'share'
    const role = body.role || 'member'

    if (!['admin', 'member', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Verify user is an admin of this workspace
    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (membershipError || !membership || membership.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can create invites' },
        { status: 403, headers: corsHeaders }
      )
    }

    // Get workspace name for metadata
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('name')
      .eq('id', workspaceId)
      .single()

    // Get inviter profile
    const { data: inviterProfile } = await supabase
      .from('user_profiles')
      .select('display_name, first_name, last_name, email')
      .eq('user_id', userId)
      .single()

    const inviterName =
      inviterProfile?.display_name ||
      (inviterProfile?.first_name && inviterProfile?.last_name
        ? `${inviterProfile.first_name} ${inviterProfile.last_name}`
        : inviterProfile?.email || 'A team member')

    // Check for existing pending invite with same contact
    const { data: existingInvite } = await supabase
      .from('workspace_invites')
      .select('id, token')
      .eq('workspace_id', workspaceId)
      .eq('email', contact)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single()

    if (existingInvite) {
      const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://kachalabs.com'}/invites/accept/${existingInvite.token}`
      return NextResponse.json(
        {
          invite: existingInvite,
          inviteUrl,
          workspaceName: workspace?.name || 'workspace',
          inviterName,
          message: 'Invite already exists',
        },
        { headers: corsHeaders }
      )
    }

    // Create new invite
    const { data: invite, error: insertError } = await supabase
      .from('workspace_invites')
      .insert({
        workspace_id: workspaceId,
        email: contact,
        role,
        invited_by: userId,
        metadata: {
          workspace_name: workspace?.name,
          inviter_name: inviterName,
        },
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating invite:', insertError)
      return NextResponse.json(
        { error: 'Failed to create invite' },
        { status: 500, headers: corsHeaders }
      )
    }

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://kachalabs.com'}/invites/accept/${invite.token}`

    return NextResponse.json(
      {
        invite,
        inviteUrl,
        workspaceName: workspace?.name || 'workspace',
        inviterName,
        message: 'Invite created successfully',
      },
      { status: 201, headers: corsHeaders }
    )
  } catch (error: any) {
    console.error('Error in POST /api/mobile/workspaces/[id]/invites:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}

/**
 * GET /api/mobile/workspaces/[id]/invites
 * List pending invites for a workspace (admin only).
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await validateMobileToken(request)
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      )
    }

    const { id: workspaceId } = await context.params
    const client = await createMobileClient(request)
    if (!client) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      )
    }

    const { supabase } = client

    // Verify admin
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (!membership || membership.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can view invites' },
        { status: 403, headers: corsHeaders }
      )
    }

    const { data: invites, error } = await supabase
      .from('workspace_invites')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching invites:', error)
      return NextResponse.json(
        { error: 'Failed to fetch invites' },
        { status: 500, headers: corsHeaders }
      )
    }

    return NextResponse.json({ invites }, { headers: corsHeaders })
  } catch (error: any) {
    console.error('Error in GET /api/mobile/workspaces/[id]/invites:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}
