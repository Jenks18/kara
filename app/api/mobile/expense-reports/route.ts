import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/auth/mobile-auth';
import { createMobileClient } from '@/lib/supabase/mobile-client';

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * Fetch report details (items count, thumbnails, total) for a list of reports.
 * Single batched query replaces the prior N+1 pattern.
 */
async function enrichReports(supabase: any, reports: any[]) {
  if (reports.length === 0) return [];

  const reportIds = reports.map((r: any) => r.id);

  // ── Primary: fetch items for all reports in a single batched query ──
  let allItems: any[] | null = null;
  let itemsError: any = null;

  try {
    const res = await supabase
      .from('expense_items')
      .select('id, report_id, image_url, amount')
      .in('report_id', reportIds)
      .order('created_at', { ascending: true });
    allItems = res.data;
    itemsError = res.error;
  } catch (e: any) {
    itemsError = e;
  }

  if (itemsError) {
    console.error(
      '[enrichReports] expense_items query failed:',
      itemsError?.message || String(itemsError),
      '| code:', itemsError?.code,
      '| hint:', itemsError?.hint,
      '| reportIds:', reportIds.slice(0, 5),
    );
  }

  // ── Fallback: if items query returned nothing, try individual counts ──
  // This catches RLS/permission issues where the batched .in() fails but
  // individual queries might succeed.
  if (!allItems || allItems.length === 0) {
    if (itemsError || reports.some((r: any) => (r.total_amount || 0) > 0)) {
      console.warn('[enrichReports] Items query empty — attempting per-report fallback');
      try {
        const fallbackResults = await Promise.all(
          reportIds.map(async (rid: string) => {
            const { data, error } = await supabase
              .from('expense_items')
              .select('id, report_id, image_url, amount')
              .eq('report_id', rid)
              .order('created_at', { ascending: true })
              .limit(10);
            if (error) {
              console.warn(`[enrichReports] fallback for ${rid}:`, error.message);
            }
            return data || [];
          })
        );
        allItems = fallbackResults.flat();
        if (allItems.length > 0) {
          console.log(`[enrichReports] Fallback recovered ${allItems.length} items`);
        }
      } catch (e: any) {
        console.error('[enrichReports] Fallback also failed:', e?.message);
      }
    }
  }

  const itemsByReport = new Map<string, any[]>();
  for (const item of allItems || []) {
    const list = itemsByReport.get(item.report_id) ?? [];
    list.push(item);
    itemsByReport.set(item.report_id, list);
  }

  return reports.map((report: any) => {
    const itemsList = itemsByReport.get(report.id) ?? [];
    const totalAmount = itemsList.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
    const thumbnails = itemsList
      .filter((item: any) => item.image_url)
      .slice(0, 3)
      .map((item: any) => item.image_url);

    // Use computed total from items when available; fall back to the stored
    // report total_amount (set by update_report_total RPC during upload).
    const finalTotal = totalAmount > 0 ? totalAmount : (report.total_amount || 0);
    const finalCount = itemsList.length > 0 ? itemsList.length : (report.items_count || 0);

    return {
      id: report.id,
      created_at: report.created_at,
      user_id: report.user_id || '',
      user_email: report.user_email || '',
      workspace_name: report.workspace_name || '',
      workspace_avatar: report.workspace_avatar || '',
      title: report.title || 'Untitled Report',
      status: report.status || 'draft',
      total_amount: finalTotal,
      items_count: finalCount,
      thumbnails,
    };
  });
}

/**
 * GET /api/mobile/expense-reports
 * List expense reports for the authenticated mobile user.
 * RLS auto-filters by user_id — no manual filtering needed.
 */
/**
 * GET /api/mobile/expense-reports
 * List expense reports with cursor-based pagination.
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
    const cursor = searchParams.get('cursor');

    const mobileClient = await createMobileClient(request);
    if (!mobileClient) {
      return NextResponse.json(
        { error: 'Authentication failed or server misconfigured' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { supabase } = mobileClient;

    let query = supabase
      .from('expense_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data: reports, error } = await query;

    if (error) {
      console.error('Error fetching reports:', error instanceof Error ? error.message : String(error));
      return NextResponse.json(
        { error: 'Failed to fetch reports', detail: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    const rows = reports || [];
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? page[page.length - 1].created_at : null;

    if (page.length === 0) {
      return NextResponse.json({ items: [], hasMore: false, nextCursor: null }, { headers: corsHeaders });
    }

    const reportsWithDetails = await enrichReports(supabase, page);
    return NextResponse.json(
      { items: reportsWithDetails, hasMore, nextCursor },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error in mobile expense-reports:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * POST /api/mobile/expense-reports
 * Create a new expense report.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const mobileClient = await createMobileClient(request);
    if (!mobileClient) {
      return NextResponse.json(
        { error: 'Authentication failed or server misconfigured' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { supabase, userId, email: userEmail } = mobileClient;

    const { data: report, error } = await supabase
      .from('expense_reports')
      .insert({
        user_id: userId,
        user_email: userEmail,
        workspace_name: body.workspaceName || body.workspace_name || '',
        title: body.title || 'Untitled Report',
        status: 'draft',
        total_amount: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating report:', error instanceof Error ? error.message : String(error));
      return NextResponse.json(
        { error: 'Failed to create report', detail: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      reportId: report.id,
      id: report.id,
      title: report.title,
      status: report.status,
      workspace_name: report.workspace_name || '',
      workspace_avatar: report.workspace_avatar || '',
      user_id: report.user_id || '',
      user_email: report.user_email || '',
      total_amount: report.total_amount || 0,
      items_count: 0,
      thumbnails: [],
      created_at: report.created_at,
    }, { status: 201, headers: corsHeaders });
  } catch (error: any) {
    console.error('Error in mobile create report:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
