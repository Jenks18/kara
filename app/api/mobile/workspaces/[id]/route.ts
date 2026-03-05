import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/auth/mobile-auth';
import { createMobileClient } from '@/lib/supabase/mobile-client';

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/mobile/workspaces/[id]
 * Get a single workspace by ID for the authenticated mobile user.
 * RLS auto-filters by user_id — no manual filtering needed.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const mobileClient = await createMobileClient(request);
    if (!mobileClient) {
      return NextResponse.json(
        { error: 'Authentication failed or server misconfigured' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { supabase } = mobileClient;
    const { data: workspace, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404, headers: corsHeaders });
    }

    // Wrap in { workspace: ... } to match iOS/Android client expectations
    return NextResponse.json({ workspace }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error in mobile workspace detail:', error instanceof Error ? error.message : String(error));
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

    const mobileClient = await createMobileClient(request);
    if (!mobileClient) {
      return NextResponse.json(
        { error: 'Authentication failed or server misconfigured' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { supabase } = mobileClient;

    // Check if this is the default workspace — block deletion
    const { data: ws } = await supabase
      .from('workspaces')
      .select('is_default')
      .eq('id', id)
      .single();

    if (ws?.is_default) {
      return NextResponse.json(
        { error: 'Cannot delete the default workspace' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { error } = await supabase
      .from('workspaces')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error deleting workspace:', error instanceof Error ? error.message : String(error));
      return NextResponse.json(
        { error: 'Failed to delete workspace', detail: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error in mobile workspace delete:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * PATCH /api/mobile/workspaces/[id]
 * Update a workspace (name, avatar, currency, etc.).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const mobileClient = await createMobileClient(request);
    if (!mobileClient) {
      return NextResponse.json(
        { error: 'Authentication failed or server misconfigured' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { supabase } = mobileClient;

    // Only allow specific fields to be updated
    // Accept both snake_case and camelCase from clients
    const fieldMap: Record<string, string> = {
      name: 'name',
      avatar: 'avatar',
      avatar_url: 'avatar_url',
      currency: 'currency',
      currency_symbol: 'currency_symbol',
      currencySymbol: 'currency_symbol',
      description: 'description',
      address: 'address',
    };
    const updates: Record<string, any> = {};
    for (const [key, value] of Object.entries(body)) {
      const dbField = fieldMap[key];
      if (dbField) {
        updates[dbField] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400, headers: corsHeaders }
      );
    }

    updates.updated_at = new Date().toISOString();

    const { data: workspace, error } = await supabase
      .from('workspaces')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error || !workspace) {
      console.error('Error updating workspace:', error instanceof Error ? error.message : String(error));
      return NextResponse.json(
        { error: error?.message || 'Workspace not found' },
        { status: error ? 500 : 404, headers: corsHeaders }
      );
    }

    // Wrap in { workspace: ... } to match iOS/Android client expectations
    return NextResponse.json({ workspace }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error in mobile workspace update:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
