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
    const workspaceId = formData.get('workspaceId') as string | null;
    const workspaceName = formData.get('workspaceName') as string | null;
    const latitude = formData.get('latitude') as string;
    const longitude = formData.get('longitude') as string;
    const qrUrl = formData.get('qrUrl') as string;

    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Verify the caller actually owns or is a member of the supplied workspace
    if (workspaceId) {
      // First try owner_id (the canonical ownership column from migration 014),
      // then fall back to user_id (the original column from migration 002),
      // then check workspace_members for collaborators.
      const { data: ownedWorkspace, error: wsCheckError } = await supabase
        .from('workspaces')
        .select('id')
        .eq('id', workspaceId)
        .maybeSingle();

      if (wsCheckError || !ownedWorkspace) {
        // Also check if user is a member of the workspace
        const { data: memberCheck } = await supabase
          .from('workspace_members')
          .select('workspace_id')
          .eq('workspace_id', workspaceId)
          .eq('user_id', userId)
          .eq('status', 'active')
          .maybeSingle();

        if (!memberCheck) {
          return NextResponse.json(
            { error: 'Workspace not found or access denied' },
            { status: 403, headers: corsHeaders }
          );
        }
      }
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
    if (!validTypes.includes(imageFile.type)) {
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

    // uploadSucceeded only requires the image to have been stored.
    // raw_receipts save failures are non-fatal — the expense_item is still created.
    const uploadSucceeded = !!result.imageUrl;
    let finalReportId: string | undefined = reportId || undefined;

    if (uploadSucceeded) {
      try {
        // Create a report if none provided
        if (!finalReportId) {
          // Look up workspace if client didn't send one
          let resolvedWorkspaceId: string | null = workspaceId || null;
          let resolvedWorkspaceName = workspaceName || 'Personal';
          
          if (!resolvedWorkspaceId) {
            const { data: userWorkspace } = await supabase
              .from('workspaces')
              .select('id, name')
              .eq('is_active', true)
              .order('created_at', { ascending: true })
              .limit(1)
              .maybeSingle();
            
            if (userWorkspace) {
              resolvedWorkspaceId = userWorkspace.id;
              resolvedWorkspaceName = userWorkspace.name;
            }
          }
          
          const { data: newReport, error: reportError } = await supabase
            .from('expense_reports')
            .insert({
              user_id: userId,
              user_email: userEmail,
              workspace_name: resolvedWorkspaceName,
              ...(resolvedWorkspaceId ? { workspace_id: resolvedWorkspaceId } : {}),
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

          // Use AI-detected category, or fall back to 'Other' (no fuel-specific bias)
          const category = result.aiEnhanced?.category || result.parsedData?.category || 'Other';

          // Compute overall confidence score (0-100)
          const confidenceScore = result.fieldConfidence
            ? Math.round(
                ((result.fieldConfidence.merchantName?.confidence || 0) +
                 (result.fieldConfidence.amount?.confidence || 0) +
                 (result.fieldConfidence.date?.confidence || 0)) / 3
              )
            : (result.kraData?.invoiceNumber ? 95 : 50);

          // Check for eTIMS QR code
          const hasEtimsQR = !!(result.qrData?.url && (
            result.qrData.url.includes('itax.kra.go.ke') || 
            result.qrData.url.includes('etims.kra.go.ke') ||
            result.qrData.url.includes('kra.go.ke')
          )) || result.parsedData?.hasEtimsQR || result.aiEnhanced?.hasEtimsQR;

          // Build receipt_details for UI display
          const receiptDetails: any = {};
          if (result.parsedData?.items && result.parsedData.items.length > 0) {
            receiptDetails.items = result.parsedData.items;
          }
          if (result.parsedData?.metadata || result.aiEnhanced?.metadata) {
            receiptDetails.metadata = result.parsedData?.metadata || result.aiEnhanced?.metadata;
          }

          const { error: itemError } = await supabase
            .from('expense_items')
            .insert({
              report_id: finalReportId,
              raw_receipt_id: result.rawReceiptId || null,
              image_url: result.imageUrl,
              category,
              amount,
              processing_status: initialStatus,
              merchant_name: merchantName,
              transaction_date: transactionDate,
              kra_invoice_number: result.kraData?.invoiceNumber || null,
              kra_verified: !!result.kraData?.invoiceNumber,
              has_etims_qr: hasEtimsQR, // NEW: Flag for KRA Verified badge
              receipt_details: Object.keys(receiptDetails).length > 0 ? receiptDetails : null, // NEW: Store items and metadata
              receipt_full_text: result.ocrData?.rawText || '', // NEW: Full OCR text for search
              description: initialStatus === 'needs_review'
                ? 'Some details could not be verified — please review and update'
                : null,
            });

          if (!itemError && amount > 0) {
            // Atomic total update — avoids read-then-write race on concurrent batch uploads
            await supabase.rpc('update_report_total', { report_id_param: finalReportId });
          }
        }
      } catch (e: any) {
        // Receipt image saved but report/expense_item creation failed
        console.error('Failed to create expense_item/report:', e?.message || e, e?.stack);
        // Return partial success so the Android app can inform the user
        return NextResponse.json({
          success: true,
          reportId: finalReportId,
          imageUrl: result.imageUrl,
          merchant: null,
          amount: 0,
          date: null,
          kraVerified: false,
          processingTimeMs: result.processingTimeMs,
          warning: 'Image uploaded but expense record creation failed — please add details manually.',
          error: null,
        }, { status: 200, headers: corsHeaders });
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
      hasEtimsQR: !!(result.qrData?.url && (
        result.qrData.url.includes('itax.kra.go.ke') || 
        result.qrData.url.includes('etims.kra.go.ke')
      )),
      processingTimeMs: result.processingTimeMs,
      confidence: result.fieldConfidence ? {
        merchantName: result.fieldConfidence.merchantName?.confidence || 0,
        amount: result.fieldConfidence.amount?.confidence || 0,
        date: result.fieldConfidence.date?.confidence || 0,
      } : null,
    }, { status: uploadSucceeded ? 200 : 500, headers: corsHeaders });

  } catch (error: any) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Error in mobile receipt upload:', msg, error instanceof Error ? error.stack : '');
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500, headers: corsHeaders }
    );
  }
}
