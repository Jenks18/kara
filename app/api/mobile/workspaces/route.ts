import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/auth/mobile-auth';
import { createMobileClient } from '@/lib/supabase/mobile-client';

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/mobile/workspaces
 * List workspaces for the authenticated mobile user.
 * RLS auto-filters by user_id — no manual filtering needed.
 */
export async function GET(request: NextRequest) {
  try {
    const mobileClient = await createMobileClient(request);
    if (!mobileClient) {
      return NextResponse.json(
        { error: 'Authentication failed or server misconfigured' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { supabase } = mobileClient;
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching workspaces:', error instanceof Error ? error.message : String(error));
      return NextResponse.json(
        { error: 'Failed to fetch workspaces', detail: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({ workspaces: data || [] }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error in mobile workspaces:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: error.message || 'Failed to fetch workspaces' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * POST /api/mobile/workspaces
 * Create a new workspace.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, avatar, currency, currencySymbol } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Workspace name is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const mobileClient = await createMobileClient(request);
    if (!mobileClient) {
      return NextResponse.json(
        { error: 'Authentication failed or server misconfigured' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { supabase, userId } = mobileClient;
    const { data: workspace, error } = await supabase
      .from('workspaces')
      .insert({
        user_id: userId,
        name,
        avatar: avatar || name.charAt(0).toUpperCase(),
        currency: currency || 'KES',
        currency_symbol: currencySymbol || 'KSh',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating workspace:', error instanceof Error ? error.message : String(error));
      return NextResponse.json(
        { error: 'Failed to create workspace', detail: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({ workspace }, { status: 201, headers: corsHeaders });
  } catch (error: any) {
    console.error('Error in mobile create workspace:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: error.message || 'Failed to create workspace' },
      { status: 500, headers: corsHeaders }
    );
  }
}
