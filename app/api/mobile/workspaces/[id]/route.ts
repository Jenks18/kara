import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders, unauthorizedResponse } from '@/lib/auth/mobile-auth';
import { createMobileClient } from '@/lib/supabase/mobile-client';
import { supabaseAdmin, isAdminConfigured } from '@/lib/supabase/admin';
import { verifyAndExtractUser } from '@/lib/auth/mobile-auth';

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
    const { id } = await params;

    // Try RLS-enabled client first
    const mobileClient = await createMobileClient(request);

    if (mobileClient) {
      const { supabase } = mobileClient;
      // RLS automatically filters by user_id — no manual .eq('user_id', ...) needed
      const { data: workspace, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !workspace) {
        return NextResponse.json({ error: 'Workspace not found' }, { status: 404, headers: corsHeaders });
      }
      return NextResponse.json(workspace, { headers: corsHeaders });
    }

    // Fallback: supabaseAdmin with manual filtering
    const user = await verifyAndExtractUser(request);
    if (!user) return unauthorizedResponse();
    if (!isAdminConfigured) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500, headers: corsHeaders });
    }

    const { data: workspace, error } = await supabaseAdmin
      .from('workspaces')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.userId)
      .single();

    if (error || !workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404, headers: corsHeaders });
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
    const { id } = await params;

    // Try RLS-enabled client first
    const mobileClient = await createMobileClient(request);

    if (mobileClient) {
      const { supabase } = mobileClient;
      const { error } = await supabase
        .from('workspaces')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        return NextResponse.json({ error: 'Failed to delete workspace' }, { status: 500, headers: corsHeaders });
      }
      return NextResponse.json({ success: true }, { headers: corsHeaders });
    }

    // Fallback: supabaseAdmin
    const user = await verifyAndExtractUser(request);
    if (!user) return unauthorizedResponse();
    if (!isAdminConfigured) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500, headers: corsHeaders });
    }

    const { error } = await supabaseAdmin
      .from('workspaces')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.userId);

    if (error) {
      return NextResponse.json({ error: 'Failed to delete workspace' }, { status: 500, headers: corsHeaders });
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
