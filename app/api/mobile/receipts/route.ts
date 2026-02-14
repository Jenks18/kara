import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromJwt, corsHeaders, unauthorizedResponse } from '@/lib/auth/mobile-auth';
import { supabaseAdmin, isAdminConfigured } from '@/lib/supabase/admin';

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/mobile/receipts
 * List expense items (receipts) for the authenticated mobile user.
 * Uses user_id directly (no Clerk API call needed).
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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    // Query expense_items via the expense_reports table using user_id
    const { data, error } = await supabaseAdmin
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
        processing_status,
        report_id,
        expense_reports!inner (
          user_id,
          workspace_name
        )
      `)
      .eq('expense_reports.user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

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
      processing_status: item.processing_status || 'processed',
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
