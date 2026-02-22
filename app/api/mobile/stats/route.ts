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
    const startOfMonth     = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

    // ── Fallbacks when RPC functions are unavailable (migration 024 not yet run). ──
    // Use transaction_date where available, falling back to created_at.
    // RLS auto-scopes to the current user via the Supabase JWT.
    const sumAmounts = async (from: string, to: string): Promise<number> => {
      const { data, error } = await supabase
        .from('expense_items')
        .select('amount, transaction_date, created_at')
        .or(`transaction_date.gte.${from.slice(0, 10)},and(transaction_date.is.null,created_at.gte.${from})`)
        .or(`transaction_date.lt.${to.slice(0, 10)},and(transaction_date.is.null,created_at.lt.${to})`);
      if (error) console.error('[stats] sumAmounts fallback error:', error.message);
      return (data ?? []).reduce((acc: number, row: { amount?: number | null }) => acc + (row.amount ?? 0), 0);
    };

    const countItems = async (from: string, to: string): Promise<number> => {
      const { count, error } = await supabase
        .from('expense_items')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', from)
        .lt('created_at', to);
      if (error) console.error('[stats] countItems fallback error:', error.message);
      return count ?? 0;
    };

    // ── Parallel server-side aggregations (RPC) + lightweight counts ──
    // Use start-of-next-month as the exclusive upper bound so items added
    // any time during the current month are counted (not capped at 'now').
    const [thisMonthTotalRes, lastMonthTotalRes, thisMonthCountRes, allTimeTotalRes, reportsRes, totalReceiptsRes] = await Promise.all([
      supabase.rpc('get_user_month_total', {
        start_date: startOfMonth,
        end_date: startOfNextMonth,
      }),
      supabase.rpc('get_user_month_total', {
        start_date: startOfLastMonth,
        end_date: startOfMonth,
      }),
      supabase.rpc('get_user_month_count', {
        start_date: startOfMonth,
        end_date: startOfNextMonth,
      }),
      supabase.rpc('get_user_total_amount'),
      supabase
        .from('expense_reports')
        .select('id', { count: 'exact', head: true }),
      supabase
        .from('expense_items')
        .select('id', { count: 'exact', head: true }),
    ]);

    // ── Log RPC errors explicitly (visible in Vercel function logs) ──
    if (thisMonthTotalRes.error) console.error('[stats] get_user_month_total (this):', thisMonthTotalRes.error.message);
    if (lastMonthTotalRes.error) console.error('[stats] get_user_month_total (last):', lastMonthTotalRes.error.message);
    if (thisMonthCountRes.error) console.error('[stats] get_user_month_count:', thisMonthCountRes.error.message);
    if (allTimeTotalRes.error)   console.error('[stats] get_user_total_amount:', allTimeTotalRes.error.message);

    // Use RPC result if available; fall back to direct queries when migration 024 hasn't run.
    const totalThisMonth = thisMonthTotalRes.error
      ? await sumAmounts(startOfMonth, startOfNextMonth)
      : Number(thisMonthTotalRes.data ?? 0);

    const totalLastMonth = lastMonthTotalRes.error
      ? await sumAmounts(startOfLastMonth, startOfMonth)
      : Number(lastMonthTotalRes.data ?? 0);

    const receiptCountThisMonth = thisMonthCountRes.error
      ? await countItems(startOfMonth, startOfNextMonth)
      : Number(thisMonthCountRes.data ?? 0);

    const totalAllTime = allTimeTotalRes.error
      ? await sumAmounts('1970-01-01T00:00:00.000Z', new Date(Date.now() + 86400000).toISOString())
      : Number(allTimeTotalRes.data ?? 0);
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
