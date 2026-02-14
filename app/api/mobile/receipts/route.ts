import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromJwt, getUserEmail, corsHeaders, unauthorizedResponse } from '@/lib/auth/mobile-auth';
import { supabaseAdmin, isAdminConfigured } from '@/lib/supabase/admin';

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/mobile/receipts
 * List expense items (receipts) for the authenticated mobile user.
 * Returns items across all workspaces, newest first.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromJwt(request);
    if (!userId) return unauthorizedResponse();

    if (!isAdminConfigured) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500, headers: corsHeaders }
      );
    }

    const userEmail = await getUserEmail(userId);
    if (!userEmail) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Query expense_items via the expense_reports table to filter by user
    // expense_items belong to expense_reports which belong to users
    let query = supabaseAdmin
      .from('expense_items')
      .select(`
        id,
        image_url,
        amount,
        category,
        merchant_name,
        transaction_date,
        created_at,
        kra_verified,
        description,
        report_id,
        expense_reports!inner (
          user_id,
          user_email,
          workspace_name
        )
      `)
      .eq('expense_reports.user_email', userEmail)
      .order('created_at', { ascending: false })
      .limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching receipts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch receipts' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Flatten the response to match Android model
    const items = (data || []).map((item: any) => ({
      id: item.id,
      image_url: item.image_url || '',
      amount: item.amount || 0,
      category: item.category || 'Uncategorized',
      merchant_name: item.merchant_name,
      transaction_date: item.transaction_date,
      created_at: item.created_at,
      kra_verified: item.kra_verified,
      description: item.description,
      workspace_name: item.expense_reports?.workspace_name || '',
    }));

    return NextResponse.json(items, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error in mobile receipts:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
