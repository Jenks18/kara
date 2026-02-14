import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/auth/mobile-auth';
import { createMobileClient } from '@/lib/supabase/mobile-client';

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * Fetch report details (items count, thumbnails, total) for a list of reports.
 */
async function enrichReports(supabase: any, reports: any[]) {
  return Promise.all(
    reports.map(async (report: any) => {
      const { data: items } = await supabase
        .from('expense_items')
        .select('id, image_url, amount')
        .eq('report_id', report.id)
        .order('created_at', { ascending: true });

      const itemsList = items || [];
      const totalAmount = itemsList.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
      const thumbnails = itemsList
        .filter((item: any) => item.image_url)
        .slice(0, 3)
        .map((item: any) => item.image_url);

      return {
        id: report.id,
        title: report.title || 'Untitled Report',
        status: report.status || 'draft',
        items_count: itemsList.length,
        total_amount: totalAmount || report.total_amount || 0,
        workspace_name: report.workspace_name || '',
        thumbnails,
        created_at: report.created_at,
      };
    })
  );
}

/**
 * GET /api/mobile/expense-reports
 * List expense reports for the authenticated mobile user.
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

    const { data: reports, error } = await supabase
      .from('expense_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching reports:', error);
      return NextResponse.json(
        { error: 'Failed to fetch reports', detail: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!reports || reports.length === 0) {
      return NextResponse.json([], { headers: corsHeaders });
    }

    const reportsWithDetails = await enrichReports(supabase, reports);
    return NextResponse.json(reportsWithDetails, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error in mobile expense-reports:', error);
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

    const { supabase, userId } = mobileClient;

    const { data: report, error } = await supabase
      .from('expense_reports')
      .insert({
        user_id: userId,
        workspace_name: body.workspaceName || body.workspace_name || '',
        title: body.title || 'Untitled Report',
        status: 'draft',
        total_amount: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating report:', error);
      return NextResponse.json(
        { error: 'Failed to create report', detail: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({ reportId: report.id, ...report }, { status: 201, headers: corsHeaders });
  } catch (error: any) {
    console.error('Error in mobile create report:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
