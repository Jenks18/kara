import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders, unauthorizedResponse } from '@/lib/auth/mobile-auth';
import { createMobileClient } from '@/lib/supabase/mobile-client';
import { supabaseAdmin, isAdminConfigured } from '@/lib/supabase/admin';
import { verifyAndExtractUser } from '@/lib/auth/mobile-auth';

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/mobile/workspaces
 * List workspaces for the authenticated mobile user.
 * Uses RLS when SUPABASE_JWT_SECRET is configured, falls back to supabaseAdmin.
 */
export async function GET(request: NextRequest) {
  try {
    // Try RLS-enabled client first
    const mobileClient = await createMobileClient(request);

    if (mobileClient) {
      const { supabase } = mobileClient;
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('RLS workspaces error:', error);
        return NextResponse.json(
          { error: 'Failed to fetch workspaces' },
          { status: 500, headers: corsHeaders }
        );
      }

      return NextResponse.json({ workspaces: data || [] }, { headers: corsHeaders });
    }

    // Fallback: supabaseAdmin with manual filtering
    const user = await verifyAndExtractUser(request);
    if (!user) return unauthorizedResponse();
    if (!isAdminConfigured) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500, headers: corsHeaders });
    }

    const { data, error } = await supabaseAdmin
      .from('workspaces')
      .select('*')
      .eq('user_id', user.userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch workspaces' }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ workspaces: data || [] }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error in mobile workspaces:', error);
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

    // Try RLS-enabled client first
    const mobileClient = await createMobileClient(request);

    if (mobileClient) {
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
        return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500, headers: corsHeaders });
      }
      return NextResponse.json({ workspace }, { status: 201, headers: corsHeaders });
    }

    // Fallback: supabaseAdmin
    const user = await verifyAndExtractUser(request);
    if (!user) return unauthorizedResponse();
    if (!isAdminConfigured) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500, headers: corsHeaders });
    }

    const { data: workspace, error } = await supabaseAdmin
      .from('workspaces')
      .insert({
        user_id: user.userId,
        name,
        avatar: avatar || name.charAt(0).toUpperCase(),
        currency: currency || 'KES',
        currency_symbol: currencySymbol || 'KSh',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ workspace }, { status: 201, headers: corsHeaders });
  } catch (error: any) {
    console.error('Error in mobile create workspace:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create workspace' },
      { status: 500, headers: corsHeaders }
    );
  }
}
