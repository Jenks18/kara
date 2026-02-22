import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/auth/mobile-auth';
import { createMobileClient } from '@/lib/supabase/mobile-client';

export const maxDuration = 30;

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/mobile/stats
 * Returns pre-computed spending statistics for the authenticated user.
 * RLS auto-filters all queries to the current user.
 *
 * Intentionally loads all expense amounts (no pagination) because stats
 * must be accurate across the entire history, not just page 1.
 * The payload is small — only `amount`, `transaction_date`, `created_at`
 * columns are fetched.
 *
 * Response:
 *   totalThisMonth       — sum of expenses in the current calendar month
 *   totalAllTime         — lifetime sum
 *   monthOverMonthTrend  — % change vs previous calendar month (0 if no last-month data)
 *   receiptCountThisMonth — count of expenses in the current calendar month
 *   totalReports         — total number of expense reports (all statuses)
 */
export async function GET(request: NextRequest) {
  try {
    const mobileClient = await createMobileClient(request);
    if (!mobileClient) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { supabase } = mobileClient;

    const now = new Date();
    const startOfMonth    = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

    // Parallel server-side aggregations (RPC) + lightweight counts.
    const [thisMonthTotalRes, lastMonthTotalRes, thisMonthCountRes, allTimeTotalRes, reportsRes, totalReceiptsRes] = await Promise.all([
      supabase.rpc('get_user_month_total', {
        start_date: startOfMonth,
        end_date: now.toISOString(),
      }),
      supabase.rpc('get_user_month_total', {
        start_date: startOfLastMonth,
        end_date: startOfMonth,
      }),
      supabase.rpc('get_user_month_count', {
        start_date: startOfMonth,
        end_date: now.toISOString(),
      }),
      supabase.rpc('get_user_total_amount'),
      supabase
        .from('expense_reports')
        .select('id', { count: 'exact', head: true }),
      supabase
        .from('expense_items')
        .select('id', { count: 'exact', head: true }),
    ]);

    const totalThisMonth = Number(thisMonthTotalRes.data || 0);
    const totalLastMonth = Number(lastMonthTotalRes.data || 0);
    const totalAllTime = Number(allTimeTotalRes.data || 0);
    const receiptCountThisMonth = Number(thisMonthCountRes.data || 0);
    const monthOverMonthTrend = totalLastMonth > 0
      ? ((totalThisMonth - totalLastMonth) / totalLastMonth) * 100
      : 0;

    return NextResponse.json({
      totalThisMonth,
      totalAllTime,
      monthOverMonthTrend,
      receiptCountThisMonth,
      totalReports: reportsRes.count ?? 0,
      totalReceipts: totalReceiptsRes.count ?? 0,
    }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error in mobile stats:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
