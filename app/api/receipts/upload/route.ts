/**
 * ENHANCED RECEIPT UPLOAD API
 * 
 * MULTI-TABLE ARCHITECTURE:
 * ========================
 * 1. raw_receipts table:
 *    - Stores ALL scraped data (QR, OCR, KRA, Gemini responses)
 *    - Completely separate columns for each data source
 *    - Immutable historical record for audit/reprocessing
 *    - Created automatically by receiptProcessor.process()
 * 
 * 2. expense_items table:
 *    - Stores ONLY clean/finalized data for app UI
 *    - Extracted from best available source in raw_receipts
 *    - User-visible fields: merchant, amount, date, category
 *    - Links to raw_receipts via raw_receipt_id
 * 
 * WORKFLOW:
 * =========
 * Receipt Image → receiptProcessor.process() 
 *                 ↓
 *              raw_receipts (all data)
 *                 ↓
 *              expense_items (clean data for UI)
 *                 ↓
 *              User sees in app
 * 
 * Uses the multi-strategy processing system with:
 * - Raw data storage for later analysis
 * - Store recognition and template matching
 * - AI-powered categorization
 * - Geocoding and location verification
 * 
 * Optimized for Vercel serverless deployment
 * WITH proper Clerk JWT + Supabase RLS authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { currentUser } from '@clerk/nextjs/server';
import { receiptProcessor } from '@/lib/receipt-processing/orchestrator';
import { rawReceiptStorage } from '@/lib/receipt-processing/raw-storage';
import { createServerClient } from '@/lib/supabase/server-client';

// Vercel serverless configuration
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds for receipt processing

export async function POST(request: NextRequest) {
  try {
    // ==========================================
    // AUTHENTICATE USER WITH CLERK
    // ==========================================
    const { userId } = await auth();
    const user = await currentUser();
    
    if (!userId || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in' },
        { status: 401 }
      );
    }

    const userEmail = user.emailAddresses[0]?.emailAddress;
    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email not found' },
        { status: 400 }
      );
    }

    // ==========================================
    // CREATE SUPABASE CLIENT WITH CLERK JWT
    // RLS will automatically filter by authenticated user!
    // ==========================================
    const supabase = await createServerClient();

    // ==========================================
    // PARSE REQUEST DATA
    // ==========================================
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const workspaceId = formData.get('workspaceId') as string;
    
    // Optional reportId for batching multiple receipts into one report
    const reportId = formData.get('reportId') as string;
    
    // Optional location data (from device GPS or photo EXIF)
    const latitude = formData.get('latitude') as string;
    const longitude = formData.get('longitude') as string;
    const locationAccuracy = formData.get('locationAccuracy') as string;
    
    // Processing options
    const skipAI = formData.get('skipAI') === 'true';
    const forceAI = formData.get('forceAI') === 'true';
    const templateId = formData.get('templateId') as string;

    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    console.log('📸 Processing receipt:', imageFile.name);

    // ==========================================
    // PROCESS THROUGH PIPELINE WITH USER CONTEXT
    // ==========================================
    const result = await receiptProcessor.process(imageFile, {
      userEmail,
      userId,
      workspaceId,
      supabaseClient: supabase, // Clerk JWT authenticated client with RLS
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
      locationAccuracy: locationAccuracy ? parseFloat(locationAccuracy) : undefined,
      skipAI,
      forceAI,
      templateId,
    });

    console.log(`✅ Processing complete: ${result.status}`);

    // IMPORTANT: If image was uploaded (rawReceiptId exists), always return success
    // AI processing failures are non-blocking and captured in warnings
    const uploadSucceeded = !!result.rawReceiptId && !!result.imageUrl;
    const httpStatus = uploadSucceeded ? 200 : 500;

    // ==========================================
    // CREATE EXPENSE ITEM FOR APP DISPLAY
    // ==========================================
    let finalReportId: string | undefined = undefined;
    
    if (uploadSucceeded) {
      try {
        finalReportId = reportId; // Use provided reportId if available
        
        if (!finalReportId) {
          // Create a NEW report only if reportId not provided
          console.log('📧 Creating new expense report for user:', userEmail, 'userId:', userId)
          
          const { data: newReport, error: reportError } = await supabase
            .from('expense_reports')
            .insert({
              user_id: userId,
              user_email: userEmail,
              workspace_name: 'Default Workspace',
              title: `Receipt - ${new Date().toLocaleString()}`,
              status: 'draft',
              total_amount: 0,
            })
            .select('id')
            .single();

          if (reportError) {
            console.error('❌ FAILED TO CREATE REPORT:', JSON.stringify(reportError, null, 2));
            console.error('❌ Report error code:', reportError.code);
            console.error('❌ Report error message:', reportError.message);
            console.error('❌ Report error details:', reportError.details);
            console.error('❌ Report error hint:', reportError.hint);
            result.warnings.push(`Could not create expense report: ${reportError.message}`);
            
            // Don't proceed if we can't create a report
            return NextResponse.json({
              success: false,
              error: `Failed to create expense report: ${reportError.message}`,
              details: reportError
            }, { status: 500 });
          }
          
          finalReportId = newReport?.id || '';
          console.log('✅ Created new report:', finalReportId, 'for email:', userEmail)
        } else {
          console.log('✅ Using existing report:', finalReportId, 'for batching')
        }

        if (finalReportId) {
          // ==========================================
          // MULTI-TABLE ARCHITECTURE:
          // 1. raw_receipts = ALL scraped data (already saved by processor)
          // 2. expense_items = Clean data for app UI (we create here)
          // ==========================================
          
          // Extract data for immediate display
          const merchantName = result.kraData?.merchantName ||
                              result.parsedData?.merchantName ||
                              result.store?.name ||
                              'Processing...';
          
          const amount = result.kraData?.totalAmount ||
                        result.parsedData?.totalAmount ||
                        0;
          
          const transactionDate = result.kraData?.invoiceDate ||
                                 result.parsedData?.transactionDate ||
                                 new Date().toISOString().split('T')[0];
          
          // Determine initial status
          const hasExtractedData = amount > 0 || merchantName !== 'Processing...';
          const needsReview = result.fieldConfidence?.merchantName?.needsReview ||
                             result.fieldConfidence?.amount?.needsReview ||
                             result.fieldConfidence?.date?.needsReview;
          const initialStatus = !hasExtractedData ? 'scanning' : (needsReview ? 'needs_review' : 'processed');
          
          // Create expense item WITH LINK to raw_receipts table
          // Use extracted data immediately if available, otherwise set to scanning
          const { error: itemError, data: createdItem } = await supabase
            .from('expense_items')
            .insert({
              report_id: finalReportId,
              raw_receipt_id: result.rawReceiptId, // 🔗 Link to raw_receipts table!
              image_url: result.imageUrl,
              category: 'other', // Default - will be updated by AI
              amount: amount,
              processing_status: initialStatus,
              merchant_name: merchantName,
              transaction_date: transactionDate,
              kra_invoice_number: result.kraData?.invoiceNumber || null,
              kra_verified: !!result.kraData?.invoiceNumber,
              // Note: needs_review_fields column not in schema yet, skipping for now
            })
            .select('id')
            .single();

          if (itemError) {
            console.error('Failed to create expense item:', itemError);
            result.warnings.push('Receipt saved but not added to reports view');
          } else {
            console.log('✅ Expense item created and linked to raw_receipts:', result.rawReceiptId);
            console.log('   Merchant:', merchantName, '| Amount:', amount, '| Status:', initialStatus);
            
            // Update report total immediately if we have an amount
            if (amount > 0) {
              const { data: reportItems } = await supabase
                .from('expense_items')
                .select('amount')
                .eq('report_id', finalReportId);
              
              const total = reportItems?.reduce((sum, i) => sum + (i.amount || 0), 0) || 0;
              
              await supabase
                .from('expense_reports')
                .update({ total_amount: total })
                .eq('id', finalReportId);
              
              console.log('✅ Report total updated immediately:', total);
            }
          }
        }
      } catch (error: any) {
        console.error('Error creating expense item:', error);
        result.warnings.push('Receipt saved but not added to reports view');
      }
    }

    // Return comprehensive result
    return NextResponse.json({
      success: uploadSucceeded, // Success if image uploaded, regardless of AI
      status: result.status,
      
      // IDs
      rawReceiptId: result.rawReceiptId,
      imageUrl: result.imageUrl,
      reportId: finalReportId, // Return reportId for batching subsequent uploads
      
      // Store information
      store: result.store,
      
      // Extracted data
      data: {
        qr: result.qrData,
        kra: result.kraData,
        ocr: result.ocrData,
        parsed: result.parsedData,
        enhanced: result.aiEnhanced,
      },
      
      // Field-level confidence for user review UI
      fieldConfidence: result.fieldConfidence,
      
      // Processing metadata
      processing: {
        template: result.templateUsed,
        confidence: result.confidence,
        timeMs: result.processingTimeMs,
        costUSD: result.costUSD,
      },
      
      // Issues
      errors: result.errors,
      warnings: result.warnings,
    }, {
      status: httpStatus,
    });
    
  } catch (error: any) {
    console.error('❌ API error:', error);
    console.error('Stack trace:', error.stack);
    
    return NextResponse.json({
      success: false,
      error: 'Processing failed',
      message: error.message || 'An unexpected error occurred',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, {
      status: 500,
    });
  }
}

/**
 * GET: Export raw receipt data to SQL-like text
 * 
 * Usage: GET /api/receipts/upload?id=<receipt_id>&format=sql
 */
export async function GET(request: NextRequest) {
  try {
    // ==========================================
    // AUTHENTICATE USER WITH CLERK
    // ==========================================
    const { userId } = await auth();
    const user = await currentUser();
    
    if (!userId || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in' },
        { status: 401 }
      );
    }

    const userEmail = user.emailAddresses[0]?.emailAddress;
    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email not found' },
        { status: 400 }
      );
    }

    // ==========================================
    // CREATE SUPABASE CLIENT WITH CLERK JWT
    // ==========================================
    const supabase = await createServerClient();

    const searchParams = request.nextUrl.searchParams;
    const receiptId = searchParams.get('id');
    const format = searchParams.get('format') || 'json';

    if (!receiptId) {
      return NextResponse.json(
        { error: 'Receipt ID required' },
        { status: 400 }
      );
    }

    const receipt = await rawReceiptStorage.get(receiptId, supabase);
    
    if (!receipt) {
      return NextResponse.json(
        { error: 'Receipt not found' },
        { status: 404 }
      );
    }

    // Export to SQL-like format
    if (format === 'sql') {
      const sqlText = await rawReceiptStorage.exportToText(receiptId, supabase);
      
      return new NextResponse(sqlText, {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="receipt-${receiptId}.sql"`,
        },
      });
    }

    // Return as JSON
    return NextResponse.json({
      success: true,
      receipt,
    });
    
  } catch (error: any) {
    console.error('❌ Export error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Export failed',
      message: error.message,
    }, {
      status: 500,
    });
  }
}
