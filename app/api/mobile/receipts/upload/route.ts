import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/auth/mobile-auth';
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
 * Upload a receipt image from the Android/iOS app.
 * Authenticates via Bearer JWT (mobile auth) — single auth pass via createMobileClient.
 */
export async function POST(request: NextRequest) {
  try {
    // Single authentication pass — createMobileClient verifies the Clerk JWT
    // and mints a Supabase client with the user's identity.
    const mobileClient = await createMobileClient(request);
    if (!mobileClient) {
      return NextResponse.json(
        { error: 'Unauthorized' },
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
    // User-supplied overrides (optional) — take precedence over AI extraction
    const userDescription = (formData.get('description') as string | null) || null;
    const userCategory    = (formData.get('category')    as string | null) || null;
    const userReimbursable = formData.get('reimbursable') === 'true';

    // On-device extracted values (shown to user on confirm screen, no raw OCR text)
    // The app processes financial data entirely on-device and only sends the
    // user-confirmed structured fields — never the raw receipt text.
    const mobileAmount     = (formData.get('amount')          as string | null) || null;
    const mobileMerchant   = (formData.get('merchant')        as string | null) || null;
    const mobileDate       = (formData.get('transactionDate') as string | null) || null;
    const mobileCurrency   = (formData.get('currency')        as string | null) || null;
    // On-device processing status — phone determines if fields need review
    const mobileProcessingStatus = (formData.get('processingStatus') as string | null) || null;

    // Legacy on-device fields (older app versions sent raw extracted data)
    const extractedText     = (formData.get('extractedText')     as string | null) || null;
    const extractedMerchant = (formData.get('extractedMerchant') as string | null) || null;
    const extractedAmount   = (formData.get('extractedAmount')   as string | null) || null;
    const extractedDate     = (formData.get('extractedDate')     as string | null) || null;
    const extractedCategory = (formData.get('extractedCategory') as string | null) || null;
    const extractedCurrency = (formData.get('extractedCurrency') as string | null) || null;

    // New path: app sends amount/merchant without raw text
    // Legacy path: app sends extractedText + extracted fields
    const hasMobileData   = !!(mobileAmount || mobileMerchant);
    const hasOnDeviceData = hasMobileData || !!extractedText;

    // Image is optional — manual entries (created without scanning) have no image.
    // When missing, we skip storage upload and set imageUrl to null.

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

    // Production guard: reject oversized uploads (skip for manual entries without images)
    if (imageFile && imageFile.size > 0 && imageFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large (${(imageFile.size / 1024 / 1024).toFixed(1)}MB). Maximum is 10MB.` },
        { status: 413, headers: corsHeaders }
      );
    }

    // Validate content type (skip for manual entries without images)
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    if (imageFile && imageFile.size > 0 && !validTypes.includes(imageFile.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Supported: JPEG, PNG, WebP, HEIC.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // ── Mobile uploads: ALL processing happens on-device ──────────────
    // The Android/iOS app runs ML Kit Text Recognition v2 + Entity Extraction
    // entirely on-device. The backend only stores the image and the
    // user-confirmed structured fields. NO server-side OCR, NO Gemini,
    // NO raw receipt text stored. Financial data never leaves the phone.
    //
    // Server-side pipeline (receiptProcessor) is DISABLED for mobile uploads.
    // It remains available only for web uploads where there is no on-device ML.
    let result: any;

    // Detect whether this is a mobile app upload (has User-Agent or mobile fields)
    const isMobileUpload = request.headers.get('x-client-platform') === 'android' ||
      request.headers.get('x-client-platform') === 'ios' ||
      hasMobileData || hasOnDeviceData;

    if (isMobileUpload) {
      // MOBILE PATH: Upload image to storage, use on-device extracted data only.
      // No OCR, no Gemini, no KRA scraping, no raw text stored.
      const clientPlatform = request.headers.get('x-client-platform') || 'unknown';
      console.log(`[receipt-upload] MOBILE (${clientPlatform}): on-device data only — server-side pipeline DISABLED`);

      let imageUrl: string | null = null;

      if (imageFile && imageFile.size > 0) {
        const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
        // Path: {userId}/{timestamp}.jpg — folder[1] must match auth.jwt()->>'sub'
        // to satisfy the receipts_insert_mobile RLS policy (migration 023).
        const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;

        const { error: storageError } = await supabase.storage
          .from('receipts')
          .upload(fileName, imageBuffer, { contentType: imageFile.type, upsert: false });

        if (!storageError) {
          const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(fileName);
          imageUrl = urlData?.publicUrl || null;
        } else {
          console.error('[receipt-upload] Storage upload failed:', storageError.message);
        }
      } else {
        console.log('[receipt-upload] MOBILE: Manual entry — no image to upload');
      }

      // Use on-device extracted fields (new path) or legacy fields (old app versions)
      const resolvedMerchant = mobileMerchant || extractedMerchant;
      const resolvedAmount   = mobileAmount || extractedAmount;
      const resolvedDate     = mobileDate || extractedDate;
      const resolvedCategory = userCategory || extractedCategory || 'Other';
      const resolvedCurrency = mobileCurrency || extractedCurrency || 'KES';

      result = {
        imageUrl,
        parsedData: {
          merchantName: resolvedMerchant,
          totalAmount: resolvedAmount ? parseFloat(resolvedAmount) : 0,
          transactionDate: resolvedDate || null,
          category: resolvedCategory,
          currency: resolvedCurrency,
          hasEtimsQR: false,
        },
        // No raw text stored — financial data stays on device
        ocrData: { rawText: '' },
        kraData: null,
        qrData: qrUrl ? { url: qrUrl } : null,
        rawReceiptId: null,
        processingTimeMs: 0,
        confidence: null,
        fieldConfidence: null,
        store: null,
        aiEnhanced: null,
        warnings: [],
        errors: [],
      };

      console.log('[receipt-upload] MOBILE result:', {
        imageUrl: !!imageUrl,
        merchant: resolvedMerchant,
        amount: resolvedAmount,
        date: resolvedDate,
        category: resolvedCategory,
        currency: resolvedCurrency,
        qrUrl: qrUrl || null,
      });
    } else {
      // WEB PATH: Full server-side pipeline (web uploads only)
      if (!imageFile || imageFile.size === 0) {
        return NextResponse.json(
          { success: false, error: 'No image provided for web upload' },
          { status: 400, headers: corsHeaders }
        );
      }
      console.log('[receipt-upload] WEB: running server-side pipeline');
      result = await receiptProcessor.process(imageFile, {
        userEmail,
        userId,
        supabaseClient: supabase,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        mobileQrUrl: qrUrl || undefined,
      });

      console.log('[receipt-upload] WEB pipeline result:', {
        imageUrl: !!result.imageUrl,
        kraData: result.kraData ? { merchant: result.kraData.merchantName, amount: result.kraData.totalAmount } : null,
        ocrData: result.ocrData ? { merchant: result.ocrData.merchantName, amount: result.ocrData.totalAmount, hasText: !!result.ocrData.rawText } : null,
        parsedData: result.parsedData ? { merchant: result.parsedData.merchantName, amount: result.parsedData.totalAmount } : null,
        qrData: !!result.qrData,
        confidence: result.confidence,
        warnings: result.warnings,
        errors: result.errors,
      });
    }

    // uploadSucceeded: image was stored (or no image was needed for a manual entry).
    // raw_receipts save failures are non-fatal — the expense_item is still created.
    const isManualEntry = !imageFile || imageFile.size === 0;
    const uploadSucceeded = isManualEntry || !!result.imageUrl;
    let finalReportId: string | undefined = reportId || undefined;
    // Hoisted so the response JSON can reference it outside the DB block.
    // For mobile, the phone's value is authoritative; for web, computed below.
    let initialStatus: string = (isMobileUpload && mobileProcessingStatus)
      ? mobileProcessingStatus
      : (isManualEntry ? 'processed' : 'needs_review');

    // Hoisted KRA fields — computed once, used in both DB insert and response
    const hasEtimsQR = !!(result.qrData?.url && (
      result.qrData.url.includes('itax.kra.go.ke') || 
      result.qrData.url.includes('etims.kra.go.ke') ||
      result.qrData.url.includes('kra.go.ke')
    )) || result.parsedData?.hasEtimsQR || result.aiEnhanced?.hasEtimsQR;

    let kraInvoiceNumber: string | null = result.kraData?.invoiceNumber || null;
    const etimsQrUrl: string | null = result.qrData?.url || null;
    if (!kraInvoiceNumber && etimsQrUrl) {
      try {
        const qrUrlObj = new URL(etimsQrUrl);
        kraInvoiceNumber = qrUrlObj.searchParams.get('invoiceNo') || null;
      } catch { /* malformed URL — skip */ }
    }

    if (uploadSucceeded) {
      try {
        // Create a report if none provided
        if (!finalReportId) {
          // Look up workspace if client didn't send one
          let resolvedWorkspaceId: string | null = workspaceId || null;
          let resolvedWorkspaceName = workspaceName || 'Personal';
          
          if (!resolvedWorkspaceId) {
            // Prefer the default workspace, fall back to oldest active
            const { data: userWorkspace } = await supabase
              .from('workspaces')
              .select('id, name')
              .eq('is_active', true)
              .order('is_default', { ascending: false })
              .order('created_at', { ascending: true })
              .limit(1)
              .maybeSingle();
            
            if (userWorkspace) {
              resolvedWorkspaceId = userWorkspace.id;
              resolvedWorkspaceName = userWorkspace.name;
            } else {
              // New user with no workspace yet — auto-create "Personal" so the
              // receipt isn't orphaned.  Mirrors the web upload route behaviour
              // and Android WorkspaceRepository which always resolves a workspace.
              console.warn(`Mobile: user ${userId} has no workspace — auto-creating Personal`);
              const { data: newWs } = await supabase
                .from('workspaces')
                .insert({
                  user_id: userId,
                  owner_id: userId,
                  name: 'Personal',
                  avatar: '💼',
                  currency: 'KES',
                  currency_symbol: 'KSh',
                  is_active: true,
                  is_default: true,
                })
                .select('id, name')
                .maybeSingle();
              if (newWs) {
                resolvedWorkspaceId = newWs.id;
                resolvedWorkspaceName = newWs.name;
              }
            }
          }
          
          const { data: newReport, error: reportError } = await supabase
            .from('expense_reports')
            .insert({
              user_id: userId,
              user_email: userEmail,
              workspace_name: resolvedWorkspaceName,
              ...(resolvedWorkspaceId ? { workspace_id: resolvedWorkspaceId } : {}),
              title: `Expense Report - ${new Date().toLocaleDateString('en-GB')}`,
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
          // Manual entries (no image) are always "processed" since the user typed the data.
          // For mobile uploads, trust the phone's processingStatus — it did the OCR.
          // For web uploads, compute from server-side extraction results.
          initialStatus = (isMobileUpload && mobileProcessingStatus)
            ? mobileProcessingStatus
            : (isManualEntry ? 'processed' : (hasExtractedData ? (needsReview ? 'needs_review' : 'processed') : 'needs_review'));

          // User-supplied category takes precedence; fall back to AI, then 'Other'.
          const category = userCategory || result.aiEnhanced?.category || result.parsedData?.category || 'Other';

          // Compute overall confidence score (0-100) — web pipeline only
          // Mobile uploads don't have fieldConfidence (OCR runs on-device).
          const confidenceScore = result.fieldConfidence
            ? Math.round(
                ((result.fieldConfidence.merchantName?.confidence || 0) +
                 (result.fieldConfidence.amount?.confidence || 0) +
                 (result.fieldConfidence.date?.confidence || 0)) / 3
              )
            : null;

          // Build receipt_details for UI display
          const receiptDetails: any = {};
          if (result.parsedData?.items && result.parsedData.items.length > 0) {
            receiptDetails.items = result.parsedData.items;
          }
          if (result.parsedData?.metadata || result.aiEnhanced?.metadata) {
            receiptDetails.metadata = result.parsedData?.metadata || result.aiEnhanced?.metadata;
          }
          if (etimsQrUrl) {
            receiptDetails.etimsQrUrl = etimsQrUrl;
          }

          const { data: insertedItem, error: itemError } = await supabase
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
              kra_invoice_number: kraInvoiceNumber,
              kra_verified: !!kraInvoiceNumber || hasEtimsQR,
              has_etims_qr: hasEtimsQR, // NEW: Flag for KRA Verified badge
              etims_qr_url: etimsQrUrl, // Full KRA QR code URL
              receipt_details: Object.keys(receiptDetails).length > 0 ? receiptDetails : null, // NEW: Store items and metadata
              receipt_full_text: result.ocrData?.rawText || '', // NEW: Full OCR text for search
              reimbursable: userReimbursable,
              // Description is user-only — never auto-generated.
              description: userDescription || null,
            })
            .select('id')
            .single();

          // Store the expense_items.id so we can return it in the response
          if (insertedItem?.id) {
            (result as any)._expenseItemId = insertedItem.id;
          }

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
          expenseItemId: null,
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
      expenseItemId: (result as any)._expenseItemId || null,
      imageUrl: result.imageUrl,
      merchant: (() => {
        const raw = result.kraData?.merchantName || result.parsedData?.merchantName || null;
        const bad = ['processing...', 'unknown', 'unknown merchant', 'n/a', 'null', '', '< receipt'];
        return (raw && !bad.includes(raw.toLowerCase().trim())) ? raw.trim() : null;
      })(),
      amount: result.kraData?.totalAmount || result.parsedData?.totalAmount || 0,
      date: result.kraData?.invoiceDate || result.parsedData?.transactionDate || null,
      category: result.parsedData?.category || 'Other',
      kraVerified: !!kraInvoiceNumber || hasEtimsQR,
      hasEtimsQR: hasEtimsQR,
      qrUrl: etimsQrUrl,
      processing_status: initialStatus,
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
