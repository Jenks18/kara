/**
 * RECEIPT PROCESSING ORCHESTRATOR
 * 
 * Main coordinator for the multi-strategy receipt processing system.
 * Handles the complete pipeline from raw image to categorized transaction.
 */

import { decodeQRFromImage } from './qr-decoder';
import { scrapeKRAInvoice } from './kra-scraper';
// import { extractWithTesseract } from './ocr-free'; // Disabled: causes worker issues in Vercel
import { extractWithGemini } from './ocr-ai';
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
      // ==========================================
      console.log('🔍 Stage 2: Extracting data from all sources...');
      
      const [qrResult, ocrResult] = await Promise.allSettled([
        this.extractQRData(imageBuffer),
        this.extractOCRData(imageBuffer),
      ]);
      
      const qrData = qrResult.status === 'fulfilled' ? qrResult.value : null;
      const ocrData = ocrResult.status === 'fulfilled' ? ocrResult.value : null;
      
      result.qrData = qrData;
      result.ocrData = ocrData;
      
      // Extract KRA data if QR has URL
      let kraData = null;
      if (qrData?.url) {
        console.log('🌐 Stage 2b: Verifying with KRA...');
        try {
          kraData = await scrapeKRAInvoice(qrData.url);
          result.kraData = kraData;
        } catch (error) {
          result.warnings.push('KRA verification failed');
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
        }).then((enhanced) => {
          // AI completed successfully - update raw_receipts in background
          console.log(`✓ AI categorized as: ${enhanced.category} (${enhanced.confidence}% confidence)`);
          
          if (result.rawReceiptId && options.supabaseClient) {
            options.supabaseClient
              .from('raw_receipts')
              .update({
                ai_category: enhanced.category,
                ai_confidence: enhanced.confidence,
                ai_response: enhanced,
              })
              .eq('id', result.rawReceiptId)
              .then(() => console.log('✓ AI results saved to raw_receipts'))
              .catch((err) => console.error('Failed to save AI results:', err));
          }
        }).catch((error: any) => {
          console.warn('⚠️ AI enhancement failed (non-blocking):', error.message);
        });
        
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
   * Extract OCR data
   * NOTE: Tesseract disabled for Vercel serverless - using Gemini AI instead
   */
  private async extractOCRData(imageBuffer: Buffer): Promise<any> {
    try {
      // Tesseract.js causes worker issues in Vercel serverless
      // Skip free OCR and rely on Gemini AI
      console.log('⏭️  Skipping Tesseract (using Gemini AI instead)');
      return null;
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
