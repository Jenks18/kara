/**
 * ENHANCED RECEIPT UPLOAD API
 * 
 * Uses the multi-strategy processing system with:
 * - Raw data storage for later analysis
 * - Store recognition and template matching
 * - AI-powered categorization
 * - Geocoding and location verification
 * 
 * Optimized for Vercel serverless deployment
 * WITH proper user authentication and RLS enforcement
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { currentUser } from '@clerk/nextjs/server';
import { receiptProcessor } from '@/lib/receipt-processing/orchestrator';
import { rawReceiptStorage } from '@/lib/receipt-processing/raw-storage';
import { createAuthenticatedClient } from '@/lib/supabase/auth-client';

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

    console.log(`🔐 Authenticated: ${userEmail} (${userId})`);

    // ==========================================
    // CREATE AUTHENTICATED SUPABASE CLIENT
    // ==========================================
    const supabaseWithUser = createAuthenticatedClient(userId, userEmail);

    // ==========================================
    // PARSE REQUEST DATA
    // ==========================================
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const workspaceId = formData.get('workspaceId') as string;
    
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
      supabaseClient: supabaseWithUser, // Pass authenticated client
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
    if (uploadSucceeded) {
      try {
        // Get or create expense report for this user
        const { data: existingReports } = await supabaseWithUser
          .from('expense_reports')
          .select('id')
          .eq('user_email', userEmail)
          .limit(1);

        let reportId: string;
        if (existingReports && existingReports.length > 0) {
          reportId = existingReports[0].id;
        } else {
          // Create new report
          const { data: newReport, error: reportError } = await supabaseWithUser
            .from('expense_reports')
            .insert({
              user_email: userEmail,
              workspace_id: workspaceId,
              status: 'draft',
            })
            .select('id')
            .single();

          if (reportError) {
            console.error('Failed to create expense report:', reportError);
            result.warnings.push('Could not create expense report');
          }
          reportId = newReport?.id || '';
        }

        if (reportId) {
          // Extract category from AI enhancement or parsed data
          const category = result.aiEnhanced?.category || 
                          result.parsedData?.category || 
                          'other';

          // Create expense item
          const { error: itemError } = await supabaseWithUser
            .from('expense_items')
            .insert({
              report_id: reportId,
              image_url: result.imageUrl,
              category: category,
              amount: result.parsedData?.totalAmount || 0,
              processing_status: result.status === 'success' ? 'processed' : 'scanning',
              merchant_name: result.parsedData?.merchantName || result.store?.name,
              date: result.parsedData?.transactionDate || new Date().toISOString(),
            });

          if (itemError) {
            console.error('Failed to create expense item:', itemError);
            result.warnings.push('Receipt saved but not added to reports view');
          } else {
            console.log('✅ Expense item created for reports view');
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
    // CREATE AUTHENTICATED SUPABASE CLIENT
    // ==========================================
    const supabaseWithUser = createAuthenticatedClient(userId, userEmail);

    const searchParams = request.nextUrl.searchParams;
    const receiptId = searchParams.get('id');
    const format = searchParams.get('format') || 'json';

    if (!receiptId) {
      return NextResponse.json(
        { error: 'Receipt ID required' },
        { status: 400 }
      );
    }

    const receipt = await rawReceiptStorage.get(receiptId, supabaseWithUser);
    
    if (!receipt) {
      return NextResponse.json(
        { error: 'Receipt not found' },
        { status: 404 }
      );
    }

    // Export to SQL-like format
    if (format === 'sql') {
      const sqlText = await rawReceiptStorage.exportToText(receiptId, supabaseWithUser);
      
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
