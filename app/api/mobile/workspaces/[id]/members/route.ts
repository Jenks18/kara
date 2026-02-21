import { NextRequest, NextResponse } from 'next/server'
import { corsHeaders, validateMobileToken } from '@/lib/auth/mobile-auth'
import { createMobileClient } from '@/lib/supabase/mobile-client'

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders })
}

/**
 * GET /api/mobile/workspaces/[id]/members
 * Mobile endpoint for listing workspace members
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await validateMobileToken(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { 
        status: 401,
        headers: corsHeaders 
      })
    }

    const { id: workspaceId } = await context.params
    const client = await createMobileClient(request)
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { 
        status: 401,
        headers: corsHeaders 
      })
    }
    const { supabase } = client

    // Check if user is a member of this workspace
    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Not a member of this workspace' }, { 
        status: 403,
        headers: corsHeaders 
      })
    }

    // Get all members of the workspace
    const { data: members, error } = await supabase
      .from('workspace_members')
      .select(`
        id,
        user_id,
        workspace_id,
        role,
        status,
        joined_at,
        invited_by
      `)
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')
      .order('joined_at', { ascending: true })

    if (error) {
      console.error('Error fetching members:', error)
      return NextResponse.json({ error: 'Failed to fetch members' }, { 
        status: 500,
        headers: corsHeaders 
      })
    }

    // Enrich with user profiles
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, user_email, display_name, first_name, last_name, avatar_emoji, avatar_color, avatar_image_url')
      .in('user_id', members.map(m => m.user_id))

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || [])

    const enrichedMembers = members.map(member => {
      const profile = profileMap.get(member.user_id)
      return {
        id: member.id,
        user_id: member.user_id,
        workspace_id: member.workspace_id,
        role: member.role,
        email: profile?.user_email || '',
        display_name: profile?.display_name,
        first_name: profile?.first_name,
        last_name: profile?.last_name,
        avatar_emoji: profile?.avatar_emoji,
        avatar_color: profile?.avatar_color,
        avatar_image_url: profile?.avatar_image_url,
        joined_at: member.joined_at,
      }
    })

    return NextResponse.json({ members: enrichedMembers }, { headers: corsHeaders })
  } catch (error) {
    console.error('Error in GET /api/mobile/workspaces/[id]/members:', error)
    return NextResponse.json({ error: 'Internal server error' }, { 
      status: 500,
      headers: corsHeaders 
    })
  }
}

/**
 * POST /api/mobile/workspaces/[id]/members
 * Mobile endpoint for adding workspace members (admin only)
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await validateMobileToken(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { 
        status: 401,
        headers: corsHeaders 
      })
    }

    const { id: workspaceId } = await context.params
    const body = await request.json()
    const { user_id: newUserId, role = 'member' } = body

    if (!newUserId) {
      return NextResponse.json({ error: 'user_id is required' }, { 
        status: 400,
        headers: corsHeaders 
      })
    }

    if (!['admin', 'member', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { 
        status: 400,
        headers: corsHeaders 
      })
    }

    const client = await createMobileClient(request)
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { 
        status: 401,
        headers: corsHeaders 
      })
    }
    const { supabase } = client

    // Check if current user is an admin of this workspace
    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (membershipError || !membership || membership.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can add members' }, { 
        status: 403,
        headers: corsHeaders 
      })
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('workspace_members')
      .select('id, status')
      .eq('workspace_id', workspaceId)
      .eq('user_id', newUserId)
      .single()

    if (existingMember) {
      if (existingMember.status === 'active') {
        return NextResponse.json({ error: 'User is already a member' }, { 
          status: 400,
          headers: corsHeaders 
        })
      }
      // Reactivate suspended member
      const { data: updated, error: updateError } = await supabase
        .from('workspace_members')
        .update({ status: 'active', role })
        .eq('id', existingMember.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error reactivating member:', updateError)
        return NextResponse.json({ error: 'Failed to reactivate member' }, { 
          status: 500,
          headers: corsHeaders 
        })
      }

      return NextResponse.json({ member: updated }, { headers: corsHeaders })
    }

    // Add new member
    const permissions = role === 'admin'
      ? { can_view: true, can_edit: true, can_delete: true, can_invite: true, can_manage_members: true }
      : role === 'member'
      ? { can_view: true, can_edit: true, can_delete: false, can_invite: false }
      : { can_view: true, can_edit: false, can_delete: false, can_invite: false }

    const { data: newMember, error: insertError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspaceId,
        user_id: newUserId,
        role,
        invited_by: userId,
        permissions,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error adding member:', insertError)
      return NextResponse.json({ error: 'Failed to add member' }, { 
        status: 500,
        headers: corsHeaders 
      })
    }

    return NextResponse.json({ member: newMember }, { 
      status: 201,
      headers: corsHeaders 
    })
  } catch (error) {
    console.error('Error in POST /api/mobile/workspaces/[id]/members:', error)
    return NextResponse.json({ error: 'Internal server error' }, { 
      status: 500,
      headers: corsHeaders 
    })
  }
}
