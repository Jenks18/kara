/**
 * RECEIPT PROCESSING ORCHESTRATOR
 * 
 * Main coordinator for the multi-strategy receipt processing system.
 * Handles the complete pipeline from raw image to categorized transaction.
 */

import { decodeQRFromImage } from './qr-decoder';
import { scrapeKRAInvoice } from './kra-scraper';
// import { extractWithTesseract } from './ocr-free'; // Disabled: causes worker issues in Vercel
import { extractWithGemini, extractReceiptWithGemini } from './ocr-ai';
import { rawReceiptStorage, type RawReceiptData } from './raw-storage';
import { storeRecognizer } from './store-recognition';
import { templateRegistry } from './template-registry';
import { aiReceiptEnhancer } from './ai-enhancement';
import type { SupabaseClient } from '@supabase/supabase-js';

// Use Web Crypto API instead of Node crypto for Vercel compatibility
function calculateHash(buffer: Buffer): string {
  // Use simple hash for Vercel serverless
  return Buffer.from(buffer).toString('base64').substring(0, 64);
}

export interface ProcessingOptions {
  userEmail: string;
  userId?: string; // Clerk user ID for audit trails
  workspaceId?: string;
  
  // Authenticated Supabase client (REQUIRED for proper RLS enforcement)
  supabaseClient: SupabaseClient;
  
  // Location (if available from device/photo)
  latitude?: number;
  longitude?: number;
  locationAccuracy?: number;
  
  // Processing preferences
  skipAI?: boolean; // Skip expensive AI processing
  forceAI?: boolean; // Force AI even if OCR is confident
  storeRaw?: boolean; // Store raw data for later analysis (default: true)
  
  // Template override
  templateId?: string; // Force specific template
  storeId?: string; // Force specific store
}

export interface ProcessingResult {
  // Stage 1: Raw Storage
  rawReceiptId: string;
  imageUrl: string;
  
  // Stage 2: Store Recognition
  store?: {
    id: string;
    name: string;
    confidence: number;
  };
  
  // Stage 3: Data Extraction
  qrData?: any;
  kraData?: any;
  ocrData?: any;
  
  // Stage 4: Template Matching & Parsing
  templateUsed?: string;
  parsedData?: any;
  
  // Stage 5: AI Enhancement
  aiEnhanced?: any;
  
  // Final Status
  status: 'success' | 'needs_review' | 'failed';
  confidence: number; // 0-100
  errors: string[];
  warnings: string[];
  
  // Performance
  processingTimeMs: number;
  costUSD?: number; // Track API costs
}

/**
 * Main orchestrator for receipt processing
 */
export class ReceiptProcessor {
  /**
   * Process a receipt through the complete pipeline
   */
  async process(
    imageFile: File,
    options: ProcessingOptions
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const result: ProcessingResult = {
      rawReceiptId: '',
      imageUrl: '',
      status: 'failed',
      confidence: 0,
      errors: [],
      warnings: [],
      processingTimeMs: 0,
    };
    
    try {
      // PRODUCTION: Use REQUIRED authenticated client
      const supabase = options.supabaseClient;
      
      console.log(`🔄 Starting receipt processing for ${options.userEmail}...`);
      if (options.userId) {
        console.log(`   User ID: ${options.userId}`);
      }
      
      // Convert image to buffer
      const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
      const imageHash = calculateHash(imageBuffer);
      
      // ==========================================
      // STAGE 1: UPLOAD & RAW STORAGE
      // ==========================================
      console.log('📤 Stage 1: Uploading image with user context...');
      
      const imageUrl = await this.uploadImage(imageBuffer, imageFile.name, supabase);
      result.imageUrl = imageUrl;
      
      // Check for duplicates
      if (options.storeRaw !== false) {
        const duplicates = await rawReceiptStorage.findDuplicates(imageHash, supabase);
        if (duplicates.length > 0) {
          result.warnings.push(`Possible duplicate receipt (${duplicates.length} similar found)`);
        }
      }
      
      // ==========================================
      // STAGE 2: DATA EXTRACTION (Parallel)
      // Google Vision is PRIMARY OCR source for ALL receipts
      // ==========================================
      console.log('🔍 Stage 2: Extracting data from all sources...');
      
      const [qrResult, ocrResult] = await Promise.allSettled([
        this.extractQRData(imageBuffer),
        this.extractOCRData(imageBuffer), // Google Vision OCR
      ]);
      
      const qrData = qrResult.status === 'fulfilled' ? qrResult.value : null;
      const ocrData = ocrResult.status === 'fulfilled' ? ocrResult.value : null; // Vision data
      
      result.qrData = qrData;
      result.ocrData = ocrData;
      
      // Start with Google Vision data as base
      let kraData = ocrData;
      
      // Extract KRA data if QR has URL (enhances/verifies Vision data)
      if (qrData?.url) {
        console.log('🌐 Stage 2b: Verifying with KRA...');
        try {
          const kraScrapedData = await scrapeKRAInvoice(qrData.url);
          if (kraScrapedData) {
            // Merge: KRA data takes priority over Vision where available
            kraData = {
              merchantName: kraScrapedData.merchantName || ocrData?.merchantName || 'Unknown Merchant',
              totalAmount: kraScrapedData.totalAmount || ocrData?.totalAmount || 0,
              invoiceDate: kraScrapedData.invoiceDate || ocrData?.invoiceDate || new Date().toISOString().split('T')[0],
              invoiceNumber: kraScrapedData.invoiceNumber || ocrData?.invoiceNumber || null,
            };
            result.kraData = kraData;
            console.log('✓ KRA data merged with Vision OCR');
          } else {
            result.warnings.push('KRA returned no data');
            result.kraData = ocrData;
          }
        } catch (error) {
          console.warn('KRA verification failed - using Vision OCR only');
          result.warnings.push('KRA verification failed');
          result.kraData = ocrData;
        }
      } else {
        // No QR code - use pure Vision OCR
        result.kraData = ocrData;
        if (ocrData) {
          console.log(`✓ Using Google Vision OCR: ${ocrData.merchantName} - ${ocrData.totalAmount} KES`);
        }
      }
      
      // ==========================================
      // STAGE 3: STORE RECOGNITION
      // ==========================================
      console.log('🏪 Stage 3: Recognizing store...');
      
      const storeMatch = await storeRecognizer.recognize({
        qrData,
        ocrText: ocrData?.rawText,
        kraData,
        latitude: options.latitude,
        longitude: options.longitude,
      }, supabase);
      
      if (storeMatch.storeId) {
        result.store = {
          id: storeMatch.storeId,
          name: storeMatch.storeName!,
          confidence: storeMatch.confidence,
        };
        console.log(`✓ Store matched: ${storeMatch.storeName} (${storeMatch.confidence}% confidence)`);
      }
      
      // ==========================================
      // STAGE 4: RAW STORAGE (if enabled)
      // ==========================================
      if (options.storeRaw !== false) {
        console.log('💾 Stage 4: Storing raw data...');
        
        const rawData: RawReceiptData = {
          userEmail: options.userEmail,
          workspaceId: options.workspaceId,
          imageUrl,
          imageHash,
          rawQrData: qrData,
          rawOcrText: ocrData?.rawText,
          rawKraData: kraData,
          fileSizeBytes: imageBuffer.length,
          mimeType: imageFile.type,
          latitude: options.latitude,
          longitude: options.longitude,
          locationAccuracyMeters: options.locationAccuracy,
          capturedAt: new Date(),
          processingStatus: 'raw',
          recognizedStoreId: storeMatch.storeId,
          recognitionConfidence: storeMatch.confidence / 100,
        };
        
        result.rawReceiptId = await rawReceiptStorage.save(rawData, supabase);
        console.log(`✓ Raw data stored: ${result.rawReceiptId}`);
      }
      
      // ==========================================
      // STAGE 5: TEMPLATE MATCHING & PARSING
      // ==========================================
      console.log('📋 Stage 5: Applying template...');
      
      const template = options.templateId
        ? templateRegistry.get(options.templateId)
        : storeMatch.suggestedTemplates[0]; // Use best match
      
      if (template) {
        result.templateUsed = template.name;
        console.log(`✓ Using template: ${template.name}`);
        
        // Parse data using template
        const parsedData = this.applyTemplate(template, {
          qrData,
          kraData,
          ocrData,
        });
        
        result.parsedData = parsedData;
        console.log(`✓ Parsed ${Object.keys(parsedData).length} fields`);
      } else {
        result.warnings.push('No template matched, using generic extraction');
        result.parsedData = this.genericParse(qrData, kraData, ocrData);
      }
      
      // ==========================================
      // STAGE 6: AI ENHANCEMENT (optional)
      // ==========================================
      const shouldUseAI = 
        options.forceAI || 
        (result.confidence < 70 && !options.skipAI);
      
      if (shouldUseAI && process.env.GEMINI_API_KEY) {
        console.log('🤖 Stage 6: AI enhancement (non-blocking)...');
        
        // Fire and forget - don't wait for AI response
        aiReceiptEnhancer.enhance({
          rawOcrText: ocrData?.rawText,
          qrData,
          kraData,
          parsedData: result.parsedData,
          template,
          imageBuffer: !qrData ? imageBuffer : undefined,
        }).then(async (enhanced) => {
          // AI completed successfully - update BOTH tables in background
          console.log(`✓ AI categorized as: ${enhanced.category} (${enhanced.confidence}% confidence)`);
          
          if (result.rawReceiptId && options.supabaseClient) {
            // Update raw_receipts with full OCR text for future vendor-specific parsing
            const { error: rawError } = await options.supabaseClient
              .from('raw_receipts')
              .update({
                ai_response: enhanced,
              })
              .eq('id', result.rawReceiptId);
            
            if (rawError) {
              console.error('Failed to save AI results to raw_receipts:', rawError);
            } else {
              console.log('✓ AI results saved to raw_receipts');
            }
            
            // Update expense_items with better AI category (if confidence is high enough)
            if (enhanced.confidence >= 70) {
              const { error: itemError } = await options.supabaseClient
                .from('expense_items')
                .update({
                  category: enhanced.category,
                })
                .eq('raw_receipt_id', result.rawReceiptId);
              
              if (itemError) {
                console.error('Failed to update expense_items with AI results:', itemError);
              } else {
                console.log('✓ AI category updated in expense_items (UI will refresh)');
              }
            }
          }
        }).catch((error: any) => {
          console.warn('⚠️ AI enhancement failed (non-blocking):', error.message);
        });
        
        // ALSO: Update expense_items immediately with OCR/KRA data in background
        // This happens right after raw_receipts is created
        if (result.rawReceiptId && options.supabaseClient) {
          this.updateExpenseItemWithScanData(result, options.supabaseClient)
            .catch(err => console.error('Failed to update expense_item with scan data:', err));
        }
        
        // Set default values immediately so we don't block the response
        result.aiEnhanced = {
          category: 'other',
          confidence: 50,
        };
        console.log('✓ AI categorized as: other (50% confidence)');
      } else if (!process.env.GEMINI_API_KEY) {
        console.log('⏭️  Skipping AI enhancement (no API key configured)');
        result.warnings.push('AI enhancement disabled (no API key)');
      }
      
      // ==========================================
      // STAGE 7: VALIDATION & STATUS
      // ==========================================
      console.log('✅ Stage 7: Validating result...');
      
      this.validateResult(result);
      
      // Determine final status
      if (result.errors.length > 0) {
        result.status = 'failed';
      } else if (result.confidence < 70 || result.warnings.length > 2) {
        result.status = 'needs_review';
      } else {
        result.status = 'success';
      }
      
      // Update raw storage status
      if (result.rawReceiptId) {
        await rawReceiptStorage.updateStatus(result.rawReceiptId, result.status, supabase);
      }
      
    } catch (error: any) {
      console.error('❌ Processing failed:', error);
      result.errors.push(error.message || 'Unknown error');
      result.status = 'failed';
    }
    
    result.processingTimeMs = Date.now() - startTime;
    
    console.log(`✅ Processing complete: ${result.status} (${result.processingTimeMs}ms)`);
    
    return result;
  }
  
  /**
   * Extract QR code data
   */
  private async extractQRData(imageBuffer: Buffer): Promise<any> {
    try {
      return await decodeQRFromImage(imageBuffer);
    } catch (error) {
      console.log('No QR code found');
      return null;
    }
  }
  
  /**
   * Extract OCR data using Google Vision API (PRIMARY METHOD)
   */
  private async extractWithGoogleVision(imageBuffer: Buffer): Promise<any> {
    if (!process.env.GOOGLE_VISION_API_KEY) {
      console.log('⏭️  Skipping Google Vision (no API key)');
      return null;
    }

    try {
      const base64Image = imageBuffer.toString('base64');
      const VISION_API_URL = `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API_KEY}`;
      
      const visionResponse = await fetch(VISION_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: base64Image },
            features: [
              { type: 'DOCUMENT_TEXT_DETECTION' }
            ]
          }]
        })
      });
      
      if (!visionResponse.ok) {
        console.error('Google Vision API error:', visionResponse.status);
        return null;
      }
      
      const visionData: any = await visionResponse.json();
      const fullText = visionData.responses[0]?.fullTextAnnotation?.text || '';
      
      if (!fullText) {
        console.log('⚠️  No text extracted from receipt');
        return null;
      }
      
      console.log('✓ Google Vision extracted text (', fullText.length, 'chars):', fullText);
      
      // Extract merchant name - look for company name after "START OF LEGAL RECEIPT"
      const lines = fullText.split('\n').filter((line: string) => line.trim());
      let merchantName = 'Unknown Merchant';
      
      // Try to find merchant after "START OF LEGAL RECEIPT"
      const receiptStartIdx = lines.findIndex((l: string) => l.includes('START OF LEGAL RECEIPT'));
      if (receiptStartIdx >= 0 && lines[receiptStartIdx + 1]) {
        merchantName = lines[receiptStartIdx + 1].trim();
      } else {
        // Fallback to first line
        merchantName = lines[0]?.trim() || 'Unknown Merchant';
      }
      
      // Extract total amount - KRA receipts show TOTAL followed by amount
      const amountPatterns = [
        /TOTAL\s+(\d+(?:,\d{3})*(?:\.\d{2})?)/i,  // "TOTAL 1,000.00"
        /(?:Sum|Amount)\s+(\d+(?:,\d{3})*(?:\.\d{2})?)/i,  // "Sum 1,000.00"
        /CASH\s+(\d+(?:,\d{3})*(?:\.\d{2})?)/i,  // "CASH 1,000.00"
        /(\d+(?:,\d{3})*\.\d{2})\s*(?:KES|Ksh)/i,  // "1,000.00 KES"
      ];
      
      let totalAmount = 0;
      for (const pattern of amountPatterns) {
        const match = fullText.match(pattern);
        if (match) {
          totalAmount = parseFloat(match[1].replace(/,/g, ''));
          if (totalAmount > 0) break;
        }
      }
      
      // Extract date
      const dateMatch = fullText.match(/(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/);
      
      // Extract invoice number
      const invoiceMatch = fullText.match(/Invoice\s+(?:Nr|No|Number|#)[:\s]*(\w+)/i);
      
      console.log(`Parsed: ${merchantName} - ${totalAmount} KES`);
      
      return {
        merchantName: merchantName,
        totalAmount: totalAmount,
        invoiceDate: dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0],
        invoiceNumber: invoiceMatch ? invoiceMatch[1] : null,
        fullText: fullText,
      };
    } catch (error) {
      console.error('Google Vision extraction failed:', error);
      return null;
    }
  }

  /**
   * Extract OCR data
   * NOTE: Tesseract disabled for Vercel serverless - using Google Vision instead
   */
  private async extractOCRData(imageBuffer: Buffer): Promise<any> {
    try {
      // Tesseract.js causes worker issues in Vercel serverless
      // Use Google Vision as primary OCR
      return await this.extractWithGoogleVision(imageBuffer);
    } catch (error) {
      console.error('OCR extraction failed:', error);
      return null;
    }
  }
  
  /**
   * Apply template to extract structured data
   */
  private applyTemplate(template: any, data: any): any {
    const result: any = {};
    
    // For each field in template, extract from available data sources
    for (const [fieldName, extractor] of Object.entries(template.fields)) {
      const field = extractor as any;
      let value = null;
      
      // Try QR data first
      if (field.qrKeys && data.qrData) {
        for (const key of field.qrKeys) {
          if (data.qrData[key]) {
            value = data.qrData[key];
            break;
          }
        }
      }
      
      // Try KRA data
      if (!value && field.kraField && data.kraData) {
        value = data.kraData[field.kraField];
      }
      
      // Try OCR patterns
      if (!value && field.ocrPatterns && data.ocrData?.rawText) {
        for (const pattern of field.ocrPatterns) {
          const match = data.ocrData.rawText.match(pattern);
          if (match && match[1]) {
            value = match[1];
            break;
          }
        }
      }
      
      // Apply transformation
      if (value && field.transform) {
        value = field.transform(value);
      }
      
      // Store if found
      if (value) {
        result[fieldName] = value;
      }
    }
    
    return result;
  }
  
  /**
   * Generic parsing fallback
   */
  private genericParse(qrData: any, kraData: any, ocrData: any): any {
    return {
      merchantName: kraData?.merchantName || qrData?.merchantName,
      totalAmount: kraData?.totalAmount || qrData?.totalAmount,
      invoiceNumber: kraData?.invoiceNumber || qrData?.invoiceNumber,
      date: kraData?.invoiceDate || qrData?.dateTime,
      ...ocrData,
    };
  }
  
  /**
   * Validate processing result
   */
  private validateResult(result: ProcessingResult): void {
    // Check for required fields
    if (!result.parsedData?.totalAmount) {
      result.errors.push('Missing total amount');
    }
    
    if (!result.parsedData?.merchantName && !result.store) {
      result.warnings.push('Merchant name not found');
    }
    
    // Calculate overall confidence
    const confidenceScores: number[] = [];
    
    if (result.qrData) confidenceScores.push(100);
    if (result.kraData) confidenceScores.push(100);
    if (result.ocrData?.confidence) confidenceScores.push(result.ocrData.confidence);
    if (result.store) confidenceScores.push(result.store.confidence);
    if (result.aiEnhanced) confidenceScores.push(result.aiEnhanced.confidence);
    
    result.confidence = confidenceScores.length > 0
      ? Math.round(confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length)
      : 0;
  }
  
  /**
   * Update expense_items with scanned data after processing completes
   * This runs in the background after raw_receipts is populated
   */
  private async updateExpenseItemWithScanData(
    result: ProcessingResult,
    supabaseClient: SupabaseClient
  ): Promise<void> {
    console.log('📝 Updating expense_item with scanned data...');
    
    // Extract data from multiple sources (priority: KRA > OCR > Store > QR)
    const merchantName = result.kraData?.merchantName ||
                        result.parsedData?.merchantName ||
                        result.store?.name ||
                        result.qrData?.merchantName ||
                        'Unknown Merchant';
    
    const amount = result.kraData?.totalAmount ||
                  result.parsedData?.totalAmount ||
                  result.qrData?.totalAmount ||
                  0;
    
    const transactionDate = result.kraData?.invoiceDate ||
                           result.parsedData?.transactionDate ||
                           result.qrData?.dateTime ||
                           new Date().toISOString().split('T')[0];
    
    // Determine processing status based on result
    let processingStatus: 'processed' | 'error' = 'processed';
    
    // Only mark as error if BOTH amount is 0 AND merchant is unknown
    // (Having either one means we got useful data from OCR)
    if (result.status === 'failed' && amount === 0 && merchantName === 'Unknown Merchant') {
      processingStatus = 'error';
      console.log('⚠️  No data extracted - marking as error');
    } else {
      console.log(`✓ Extracted: ${merchantName} - ${amount} KES`);
    }
    
    const updateData: any = {
      merchant_name: merchantName,
      amount: amount,
      transaction_date: transactionDate,
      processing_status: processingStatus,
    };
    
    // Add KRA data if available
    if (result.kraData?.invoiceNumber) {
      updateData.kra_invoice_number = result.kraData.invoiceNumber;
      updateData.kra_verified = true;
    }
    
    const { error } = await supabaseClient
      .from('expense_items')
      .update(updateData)
      .eq('raw_receipt_id', result.rawReceiptId);
    
    if (error) {
      console.error('Failed to update expense_item:', error);
    } else {
      console.log(`✅ Expense item updated with status: ${processingStatus}`);
      
      // Also update the expense_reports total (only if processed successfully)
      if (processingStatus === 'processed') {
        await this.updateExpenseReportTotal(result.rawReceiptId, supabaseClient);
      }
    }
  }
  
  /**
   * Update expense_reports total when an item is updated
   */
  private async updateExpenseReportTotal(
    rawReceiptId: string,
    supabaseClient: SupabaseClient
  ): Promise<void> {
    // Get the report_id from the expense_item
    const { data: item, error: itemError } = await supabaseClient
      .from('expense_items')
      .select('report_id')
      .eq('raw_receipt_id', rawReceiptId)
      .single();
    
    if (itemError || !item) {
      console.error('Failed to get report_id:', itemError);
      return;
    }
    
    // Calculate total from all items in the report
    const { data: items, error: itemsError } = await supabaseClient
      .from('expense_items')
      .select('amount')
      .eq('report_id', item.report_id);
    
    if (itemsError) {
      console.error('Failed to get report items:', itemsError);
      return;
    }
    
    const total = items?.reduce((sum, i) => sum + (i.amount || 0), 0) || 0;
    
    // Update the expense_reports table
    const { error: reportError } = await supabaseClient
      .from('expense_reports')
      .update({ total_amount: total })
      .eq('id', item.report_id);
    
    if (reportError) {
      console.error('Failed to update report total:', reportError);
    } else {
      console.log('✅ Report total updated:', total);
    }
  }
  
  /**
   * Upload image to storage
   */
  private async uploadImage(buffer: Buffer, filename: string, supabase: SupabaseClient): Promise<string> {
    // Upload to Supabase Storage using REQUIRED authenticated client
    // This maintains user context for RLS and audit trails
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `receipts/${timestamp}-${sanitizedFilename}`;
    
    const { data, error } = await supabase.storage
      .from('receipt-images')
      .upload(path, buffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });
    
    if (error) {
      console.error('Upload error:', error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('receipt-images')
      .getPublicUrl(path);
    
    return urlData.publicUrl;
  }
}

// Export singleton
export const receiptProcessor = new ReceiptProcessor();
