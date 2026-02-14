import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromJwt, corsHeaders, unauthorizedResponse } from '@/lib/auth/mobile-auth';
import { supabaseAdmin, isAdminConfigured } from '@/lib/supabase/admin';

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/mobile/workspaces/[id]
 * Get a single workspace by ID for the authenticated mobile user.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromJwt(request);
    if (!userId) return unauthorizedResponse();

    if (!isAdminConfigured) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500, headers: corsHeaders }
      );
    }

    const { id } = await params;

    const { data: workspace, error } = await supabaseAdmin
      .from('workspaces')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(workspace, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error in mobile workspace detail:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * DELETE /api/mobile/workspaces/[id]
 * Soft-delete a workspace (set is_active = false).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromJwt(request);
    if (!userId) return unauthorizedResponse();

    if (!isAdminConfigured) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500, headers: corsHeaders }
      );
    }

    const { id } = await params;

    const { error } = await supabaseAdmin
      .from('workspaces')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete workspace' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error in mobile workspace delete:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
