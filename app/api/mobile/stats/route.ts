import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/auth/mobile-auth';
import { createMobileClient } from '@/lib/supabase/mobile-client';

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

    // Four parallel queries — each fetches one tiny column set with RLS auto-filter.
    const [thisMonthRes, lastMonthRes, allTimeRes, reportsRes] = await Promise.all([
      // This month: use transaction_date if set, fall back to created_at via filter union
      supabase
        .from('expense_items')
        .select('amount, transaction_date, created_at')
        .gte('created_at', startOfMonth),
      supabase
        .from('expense_items')
        .select('amount, transaction_date, created_at')
        .gte('created_at', startOfLastMonth)
        .lt('created_at', startOfMonth),
      supabase
        .from('expense_items')
        .select('amount'),
      supabase
        .from('expense_reports')
        .select('id', { count: 'exact', head: true }),
    ]);

    /**
     * Decide whether an item falls within [from, to) using transaction_date if
     * available, otherwise created_at.  Mirrors AppDataStore.recomputeStats().
     */
    const inRange = (
      row: { amount: number; transaction_date?: string | null; created_at: string },
      from: Date,
      to?: Date
    ): boolean => {
      const raw = row.transaction_date || row.created_at;
      const d = new Date(raw);
      if (isNaN(d.getTime())) return false;
      if (d < from) return false;
      if (to && d >= to) return false;
      return true;
    };

    const startOfMonthDate    = new Date(startOfMonth);
    const startOfLastMonthDate = new Date(startOfLastMonth);

    // Re-filter with transaction_date logic (the DB query used created_at for a rough
    // pre-filter to reduce rows; now we apply the precise date field here).
    const thisMonthItems = (thisMonthRes.data || []).filter(
      r => inRange(r as any, startOfMonthDate)
    );
    const lastMonthItems = (lastMonthRes.data || []).filter(
      r => inRange(r as any, startOfLastMonthDate, startOfMonthDate)
    );

    const totalThisMonth  = thisMonthItems.reduce((s, r) => s + (r.amount || 0), 0);
    const totalLastMonth  = lastMonthItems.reduce((s, r) => s + (r.amount || 0), 0);
    const totalAllTime    = (allTimeRes.data || []).reduce((s, r) => s + (r.amount || 0), 0);
    const monthOverMonthTrend = totalLastMonth > 0
      ? ((totalThisMonth - totalLastMonth) / totalLastMonth) * 100
      : 0;

    return NextResponse.json({
      totalThisMonth,
      totalAllTime,
      monthOverMonthTrend,
      receiptCountThisMonth: thisMonthItems.length,
      totalReports: reportsRes.count ?? 0,
    }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error in mobile stats:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
