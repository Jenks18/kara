import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase/server-client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/workspaces/[id]/members
 * List all members of a workspace
 * User must be a member of the workspace to view members
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401})
    }

    const { id: workspaceId } = await context.params
    const supabase = await createServerClient()

    // Check if user is a member of this workspace (any status)
    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Not a member of this workspace' }, { status: 403 })
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
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
    }

    // Enrich with user profiles
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, email, display_name, first_name, last_name, avatar_emoji, avatar_color, avatar_image_url')
      .in('user_id', members.map(m => m.user_id))

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || [])

    const enrichedMembers = members.map(member => {
      const profile = profileMap.get(member.user_id)
      return {
        id: member.id,
        user_id: member.user_id,
        workspace_id: member.workspace_id,
        role: member.role,
        email: profile?.email || '',
        display_name: profile?.display_name,
        first_name: profile?.first_name,
        last_name: profile?.last_name,
        avatar_emoji: profile?.avatar_emoji,
        avatar_color: profile?.avatar_color,
        avatar_image_url: profile?.avatar_image_url,
        joined_at: member.joined_at,
      }
    })

    return NextResponse.json({ members: enrichedMembers })
  } catch (error) {
    console.error('Error in GET /api/workspaces/[id]/members:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/workspaces/[id]/members
 * Add a member to the workspace (admin only)
 * Body: { user_id: string, role: 'admin' | 'member' | 'viewer' }
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
    const { user_id: newUserId, role = 'member' } = body

    if (!newUserId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    if (!['admin', 'member', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const supabase = await createServerClient()

    // Check if current user is an admin of this workspace
    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (membershipError || !membership || membership.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can add members' }, { status: 403 })
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
        return NextResponse.json({ error: 'User is already a member' }, { status: 400 })
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
        return NextResponse.json({ error: 'Failed to reactivate member' }, { status: 500 })
      }

      return NextResponse.json({ member: updated })
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
      return NextResponse.json({ error: 'Failed to add member' }, { status: 500 })
    }

    return NextResponse.json({ member: newMember }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/workspaces/[id]/members:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/workspaces/[id]/members/[memberId]
 * Remove a member from the workspace (admin only)
 */
export async function DELETE(
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
    const memberIdToRemove = searchParams.get('memberId')

    if (!memberIdToRemove) {
      return NextResponse.json({ error: 'memberId is required' }, { status: 400 })
    }

    const supabase = await createServerClient()

    // Check if current user is an admin of this workspace
    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (membershipError || !membership || membership.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can remove members' }, { status: 403 })
    }

    // Don't allow removing self if you're the only admin
    const { data: admins } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', workspaceId)
      .eq('role', 'admin')
      .eq('status', 'active')

    if (admins && admins.length === 1 && admins[0].user_id === userId && memberIdToRemove === userId) {
      return NextResponse.json({ error: 'Cannot remove the only admin' }, { status: 400 })
    }

    // Remove member (soft delete by setting status = 'suspended')
    const { error: deleteError } = await supabase
      .from('workspace_members')
      .update({ status: 'suspended' })
      .eq('id', memberIdToRemove)
      .eq('workspace_id', workspaceId)

    if (deleteError) {
      console.error('Error removing member:', deleteError)
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/workspaces/[id]/members:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
