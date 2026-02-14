import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromJwt, corsHeaders, unauthorizedResponse } from '@/lib/auth/mobile-auth';
import { supabaseAdmin, isAdminConfigured } from '@/lib/supabase/admin';

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/mobile/expense-reports
 * List expense reports for the authenticated mobile user.
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

    // Fetch reports using user_id directly (matches how webapp uses RLS)
    const { data: reports, error: reportsError } = await supabaseAdmin
      .from('expense_reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (reportsError) {
      console.error('Error fetching reports:', reportsError);
      return NextResponse.json(
        { error: 'Failed to fetch reports' },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!reports || reports.length === 0) {
      return NextResponse.json([], { headers: corsHeaders });
    }

    // Fetch items for each report to get count and thumbnails
    const reportsWithDetails = await Promise.all(
      reports.map(async (report: any) => {
        const { data: items } = await supabaseAdmin
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
    const userId = getUserIdFromJwt(request);
    if (!userId) return unauthorizedResponse();

    if (!isAdminConfigured) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500, headers: corsHeaders }
      );
    }

    const body = await request.json();

    const { data: report, error } = await supabaseAdmin
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
        { error: 'Failed to create report' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { reportId: report.id, ...report },
      { status: 201, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error in mobile create report:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
