import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/auth/mobile-auth';
import { createMobileClient } from '@/lib/supabase/mobile-client';

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * Flatten raw expense_items + joined report data into the Android model shape.
 */
function flattenItems(data: any[]) {
  return data.map((item: any) => ({
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
}

/**
 * GET /api/mobile/receipts
 * List expense items (receipts) for the authenticated mobile user.
 * RLS auto-filters by user_id — no manual filtering needed.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const mobileClient = await createMobileClient(request);
    if (!mobileClient) {
      return NextResponse.json(
        { error: 'Authentication failed or server misconfigured' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { supabase } = mobileClient;

    const { data, error } = await supabase
      .from('expense_items')
      .select(`
        id, image_url, amount, category, merchant_name,
        transaction_date, created_at, kra_verified, description,
        processing_status, report_id,
        expense_reports!inner ( user_id, workspace_name )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching receipts:', error?.message || error);
      return NextResponse.json(
        { error: 'Failed to fetch receipts', detail: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(flattenItems(data || []), { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error in mobile receipts:', error?.message || error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
