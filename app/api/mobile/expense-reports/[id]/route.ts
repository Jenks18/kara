import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/auth/mobile-auth';
import { createMobileClient } from '@/lib/supabase/mobile-client';

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/mobile/expense-reports/:id
 * Fetch a single expense report with its items.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const mobileClient = await createMobileClient(request);
    if (!mobileClient) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { supabase } = mobileClient;

    const { data: report, error: reportError } = await supabase
      .from('expense_reports')
      .select('*')
      .eq('id', id)
      .single();

    if (reportError || !report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    const { data: items } = await supabase
      .from('expense_items')
      .select('id, image_url, amount, category, merchant_name, transaction_date, created_at, kra_verified, processing_status, description')
      .eq('report_id', id)
      .order('created_at', { ascending: false });

    const itemsList = items || [];
    const totalAmount = itemsList.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);

    return NextResponse.json({
      id: report.id,
      title: report.title || 'Untitled Report',
      status: report.status || 'draft',
      workspace_name: report.workspace_name || '',
      total_amount: totalAmount || report.total_amount || 0,
      items_count: itemsList.length,
      created_at: report.created_at,
      items: itemsList,
    }, { headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
