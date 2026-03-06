import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/auth/mobile-auth';
import { createMobileClient } from '@/lib/supabase/mobile-client';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/mobile/receipts/:id
 * Fetch a single expense item by ID.
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

    const { data, error } = await supabase
      .from('expense_items')
      .select(`
        id, image_url, amount, category, merchant_name,
        transaction_date, created_at, kra_verified, description,
        processing_status, report_id, kra_invoice_number, etims_qr_url,
        expense_reports!inner ( user_id, workspace_name, workspace_avatar, title )
      `)
      .eq('id', id)
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
      etims_qr_url: data.etims_qr_url,
      description: data.description,
      processing_status: data.processing_status || 'processed',
      report_id: data.report_id,
      workspace_name: (data as any).expense_reports?.workspace_name || '',
      workspace_avatar: (data as any).expense_reports?.workspace_avatar || '',
      report_title: (data as any).expense_reports?.title || '',
    }, { headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * PATCH /api/mobile/receipts/:id
 * Update editable fields on an expense item.
 * Allows the user to correct AI-extracted data (merchant, amount, category, date, notes).
 */
export async function PATCH(
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
    const body = await request.json();

    // Build the update payload — only include fields that were explicitly sent
    const allowedFields: Record<string, string> = {
      merchant_name: 'string',
      amount: 'number',
      category: 'string',
      transaction_date: 'string',
      description: 'string',
    };

    const updates: Record<string, any> = {};
    for (const [field, type] of Object.entries(allowedFields)) {
      if (field in body) {
        const val = body[field];
        if (type === 'number' && typeof val === 'number' && val >= 0) {
          updates[field] = val;
        } else if (type === 'string' && typeof val === 'string') {
          updates[field] = val;
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400, headers: corsHeaders }
      );
    }

    // When user manually edits, mark as reviewed
    updates.processing_status = 'processed';

    const { data, error } = await supabase
      .from('expense_items')
      .update(updates)
      .eq('id', id)
      .select('id, amount, report_id')
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || 'Receipt not found' },
        { status: error ? 500 : 404, headers: corsHeaders }
      );
    }

    // Recalculate report total if amount changed
    if ('amount' in updates && data.report_id) {
      const { data: reportItems } = await supabase
        .from('expense_items')
        .select('amount')
        .eq('report_id', data.report_id);
      const total = reportItems?.reduce((sum: number, i: any) => sum + (i.amount || 0), 0) || 0;
      await supabase
        .from('expense_reports')
        .update({ total_amount: total })
        .eq('id', data.report_id);
    }

    return NextResponse.json({ success: true, id: data.id }, { headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
