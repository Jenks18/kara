import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders, verifyAndExtractUser } from '@/lib/auth/mobile-auth';
import { createMobileClient } from '@/lib/supabase/mobile-client';
import { receiptProcessor } from '@/lib/receipt-processing/orchestrator';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Max file size: 10MB (production guard for Play Store users)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * POST /api/mobile/receipts/upload
 * Upload a receipt image from the Android app.
 * Authenticates via Bearer JWT (mobile auth).
 * Processes the image through the same pipeline as the web app.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAndExtractUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      );
    }

    const mobileClient = await createMobileClient(request);
    if (!mobileClient) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { supabase, userId, email: userEmail } = mobileClient;

    // Parse multipart form data
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const reportId = formData.get('reportId') as string;
    const latitude = formData.get('latitude') as string;
    const longitude = formData.get('longitude') as string;
    const qrUrl = formData.get('qrUrl') as string;

    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Production guard: reject oversized uploads
    if (imageFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large (${(imageFile.size / 1024 / 1024).toFixed(1)}MB). Maximum is 10MB.` },
        { status: 413, headers: corsHeaders }
      );
    }

    // Validate content type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    if (!validTypes.some(t => imageFile.type.startsWith(t.split('/')[0]))) {
      return NextResponse.json(
        { error: 'Invalid file type. Supported: JPEG, PNG, WebP, HEIC.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Process through the receipt pipeline
    const result = await receiptProcessor.process(imageFile, {
      userEmail,
      userId,
      supabaseClient: supabase,
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
      mobileQrUrl: qrUrl || undefined,
    });

    const uploadSucceeded = !!result.rawReceiptId && !!result.imageUrl;
    let finalReportId: string | undefined = reportId || undefined;

    if (uploadSucceeded) {
      try {
        // Create a report if none provided
        if (!finalReportId) {
          const { data: newReport, error: reportError } = await supabase
            .from('expense_reports')
            .insert({
              user_id: userId,
              user_email: userEmail,
              workspace_name: 'Default Workspace',
              title: `Receipt - ${new Date().toLocaleDateString('en-GB')}`,
              status: 'draft',
              total_amount: 0,
            })
            .select('id')
            .single();

          if (reportError) {
            return NextResponse.json({
              success: false,
              error: `Failed to create report: ${reportError.message}`,
            }, { status: 500, headers: corsHeaders });
          }
          finalReportId = newReport?.id;
        }

        if (finalReportId) {
          // Build merchant name from best available source, filtering out garbage values
          const rawMerchant = result.kraData?.merchantName ||
            result.parsedData?.merchantName ||
            result.store?.name ||
            null;
          const garbageNames = ['processing...', 'unknown', 'unknown merchant', 'n/a', 'null', '', '< receipt'];
          const merchantName = (rawMerchant && !garbageNames.includes(rawMerchant.toLowerCase().trim()))
            ? rawMerchant.trim()
            : 'Unknown Merchant';

          const amount = result.kraData?.totalAmount ||
            result.parsedData?.totalAmount ||
            0;

          let transactionDate = result.kraData?.invoiceDate || result.parsedData?.transactionDate;
          if (transactionDate) {
            const dateObj = new Date(transactionDate);
            const today = new Date();
            const twoYearsAgo = new Date();
            twoYearsAgo.setFullYear(today.getFullYear() - 2);
            if (dateObj > today || dateObj < twoYearsAgo || isNaN(dateObj.getTime())) {
              transactionDate = today.toISOString().split('T')[0];
            }
          } else {
            transactionDate = new Date().toISOString().split('T')[0];
          }

          const hasExtractedData = amount > 0 && merchantName !== 'Unknown Merchant';
          const needsReview = result.fieldConfidence?.merchantName?.needsReview ||
            result.fieldConfidence?.amount?.needsReview ||
            result.fieldConfidence?.date?.needsReview;
          const initialStatus = hasExtractedData ? (needsReview ? 'needs_review' : 'processed') : 'needs_review';

          // Use AI-detected category, fall back to 'Fuel' for KRA-verified receipts
          const category = result.parsedData?.category || (result.kraData?.invoiceNumber ? 'Fuel' : 'Other');

          // Compute overall confidence score (0-100)
          const confidenceScore = result.fieldConfidence
            ? Math.round(
                ((result.fieldConfidence.merchantName?.confidence || 0) +
                 (result.fieldConfidence.amount?.confidence || 0) +
                 (result.fieldConfidence.date?.confidence || 0)) / 3
              )
            : (result.kraData?.invoiceNumber ? 95 : 50);

          const { error: itemError } = await supabase
            .from('expense_items')
            .insert({
              report_id: finalReportId,
              raw_receipt_id: result.rawReceiptId,
              image_url: result.imageUrl,
              category,
              amount,
              processing_status: initialStatus,
              merchant_name: merchantName,
              transaction_date: transactionDate,
              kra_invoice_number: result.kraData?.invoiceNumber || null,
              kra_verified: !!result.kraData?.invoiceNumber,
              description: initialStatus === 'needs_review'
                ? 'Some details could not be verified — please review and update'
                : null,
            });

          if (!itemError && amount > 0) {
            const { data: reportItems } = await supabase
              .from('expense_items')
              .select('amount')
              .eq('report_id', finalReportId);
            const total = reportItems?.reduce((sum: number, i: any) => sum + (i.amount || 0), 0) || 0;
            await supabase
              .from('expense_reports')
              .update({ total_amount: total })
              .eq('id', finalReportId);
          }
        }
      } catch (e: any) {
        // Receipt saved but report creation failed — non-fatal
      }
    }

    return NextResponse.json({
      success: uploadSucceeded,
      reportId: finalReportId,
      imageUrl: result.imageUrl,
      merchant: (() => {
        const raw = result.kraData?.merchantName || result.parsedData?.merchantName || null;
        const bad = ['processing...', 'unknown', 'unknown merchant', 'n/a', 'null', '', '< receipt'];
        return (raw && !bad.includes(raw.toLowerCase().trim())) ? raw.trim() : null;
      })(),
      amount: result.kraData?.totalAmount || result.parsedData?.totalAmount || 0,
      date: result.kraData?.invoiceDate || result.parsedData?.transactionDate || null,
      category: result.parsedData?.category || 'Other',
      kraVerified: !!result.kraData?.invoiceNumber,
      processingTimeMs: result.processingTimeMs,
      confidence: result.fieldConfidence ? {
        merchantName: result.fieldConfidence.merchantName?.confidence || 0,
        amount: result.fieldConfidence.amount?.confidence || 0,
        date: result.fieldConfidence.date?.confidence || 0,
      } : null,
    }, { status: uploadSucceeded ? 200 : 500, headers: corsHeaders });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Processing failed' },
      { status: 500, headers: corsHeaders }
    );
  }
}
