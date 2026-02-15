import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/auth/mobile-auth';
import { createMobileClient } from '@/lib/supabase/mobile-client';

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/mobile/receipts/:id
 * Fetch a single expense item by ID.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const mobileClient = await createMobileClient(request);
    if (!mobileClient) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { supabase } = mobileClient;

    const { data, error } = await supabase
      .from('expense_items')
      .select(`
        id, image_url, amount, category, merchant_name,
        transaction_date, created_at, kra_verified, description,
        processing_status, report_id, kra_invoice_number,
        expense_reports!inner ( user_id, workspace_name, title )
      `)
      .eq('id', params.id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Receipt not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      id: data.id,
      image_url: data.image_url || '',
      amount: data.amount || 0,
      category: data.category || 'Uncategorized',
      merchant_name: data.merchant_name,
      transaction_date: data.transaction_date,
      created_at: data.created_at,
      kra_verified: data.kra_verified,
      kra_invoice_number: data.kra_invoice_number,
      description: data.description,
      processing_status: data.processing_status || 'processed',
      report_id: data.report_id,
      workspace_name: (data as any).expense_reports?.workspace_name || '',
      report_title: (data as any).expense_reports?.title || '',
    }, { headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
