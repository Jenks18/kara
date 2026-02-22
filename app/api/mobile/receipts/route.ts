import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/auth/mobile-auth';
import { createMobileClient } from '@/lib/supabase/mobile-client';

export const maxDuration = 30;

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
    report_id: item.report_id,
    workspace_name: item.expense_reports?.workspace_name || '',
  }));
}

/**
 * GET /api/mobile/receipts
 * List expense items with cursor-based pagination.
 * RLS auto-filters by user_id — no manual filtering needed.
 *
 * Query params:
 *   limit  — page size, max 100, default 50
 *   cursor — created_at ISO timestamp; returns items older than this value
 *
 * Response: { items, hasMore, nextCursor }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawLimit = parseInt(searchParams.get('limit') || '50', 10);
    const limit = Math.min(Number.isFinite(rawLimit) ? rawLimit : 50, 100);
    const cursor = searchParams.get('cursor'); // ISO timestamp — fetch items before this

    const mobileClient = await createMobileClient(request);
    if (!mobileClient) {
      return NextResponse.json(
        { error: 'Authentication failed or server misconfigured' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { supabase } = mobileClient;

    // Fetch limit+1 rows — extra row tells us whether a next page exists.
    // Use a LEFT JOIN on expense_reports (not !inner) so expense_items that
    // have no report (report_id IS NULL) or point to a deleted report are
    // still returned rather than silently dropped.
    let query = supabase
      .from('expense_items')
      .select(`
        id, image_url, amount, category, merchant_name,
        transaction_date, created_at, kra_verified, description,
        processing_status, report_id,
        expense_reports ( user_id, workspace_name )
      `)
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching receipts:', error instanceof Error ? error.message : String(error));
      return NextResponse.json(
        { error: 'Failed to fetch receipts', detail: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    const rows = data || [];
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? page[page.length - 1].created_at : null;

    return NextResponse.json(
      { items: flattenItems(page), hasMore, nextCursor },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error in mobile receipts:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
