/**
 * RAW RECEIPT STORAGE
 * 
 * Stores complete raw data from receipts for later analysis.
 * Think of this as a "digital shoebox" - everything goes in as-is.
 */

import { supabase as createClient } from '@/lib/supabase/client';

export interface RawReceiptData {
  id?: string;
  userEmail: string;
  workspaceId?: string;
  
  // Original receipt
  imageUrl: string;
  imageHash?: string;
  
  // Raw extracted data (stored as JSON)
  rawQrData?: any;
  rawOcrText?: string;
  rawKraData?: any;
  rawGeminiData?: any;
  
  // Image metadata
  fileSizeBytes?: number;
  imageWidth?: number;
  imageHeight?: number;
  mimeType?: string;
  
  // Location data
  latitude?: number;
  longitude?: number;
  locationAccuracyMeters?: number;
  capturedAt?: Date;
  
  // Processing status
  processingStatus?: 'raw' | 'parsed' | 'verified' | 'failed';
  processingAttempts?: number;
  lastProcessedAt?: Date;
  
  // Store recognition
  recognizedStoreId?: string;
  recognitionConfidence?: number;
}

export interface RawReceiptStorage {
  // Save raw receipt
  save(data: RawReceiptData): Promise<string>; // Returns ID
  
  // Get raw receipt by ID
  get(id: string): Promise<RawReceiptData | null>;
  
  // Update processing status
  updateStatus(id: string, status: string, metadata?: any): Promise<void>;
  
  // Find duplicates by image hash
  findDuplicates(imageHash: string): Promise<RawReceiptData[]>;
  
  // Get receipts by user
  getByUser(userEmail: string, limit?: number): Promise<RawReceiptData[]>;
  
  // Get receipts by store
  getByStore(storeId: string, limit?: number): Promise<RawReceiptData[]>;
  
  // Get unprocessed receipts
  getUnprocessed(limit?: number): Promise<RawReceiptData[]>;
  
  // Export raw data to text (SQL-like format)
  exportToText(id: string): Promise<string>;
}

/**
 * Supabase implementation of raw receipt storage
 */
export class SupabaseRawReceiptStorage implements RawReceiptStorage {
  private supabase = createClient;
  
  async save(data: RawReceiptData): Promise<string> {
    const { data: result, error } = await this.supabase
      .from('raw_receipts')
      .insert({
        user_email: data.userEmail,
        workspace_id: data.workspaceId,
        image_url: data.imageUrl,
        image_hash: data.imageHash,
        raw_qr_data: data.rawQrData,
        raw_ocr_text: data.rawOcrText,
        raw_kra_data: data.rawKraData,
        raw_gemini_data: data.rawGeminiData,
        file_size_bytes: data.fileSizeBytes,
        image_width: data.imageWidth,
        image_height: data.imageHeight,
        mime_type: data.mimeType,
        latitude: data.latitude,
        longitude: data.longitude,
        location_accuracy_meters: data.locationAccuracyMeters,
        captured_at: data.capturedAt?.toISOString(),
        processing_status: data.processingStatus || 'raw',
        processing_attempts: data.processingAttempts || 0,
        recognized_store_id: data.recognizedStoreId,
        recognition_confidence: data.recognitionConfidence,
      })
      .select('id')
      .single();
    
    if (error) throw error;
    return result.id;
  }
  
  async get(id: string): Promise<RawReceiptData | null> {
    const { data, error } = await this.supabase
      .from('raw_receipts')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return null;
    
    return this.mapFromDB(data);
  }
  
  async updateStatus(id: string, status: string, metadata?: any): Promise<void> {
    await this.supabase
      .from('raw_receipts')
      .update({
        processing_status: status,
        last_processed_at: new Date().toISOString(),
        processing_attempts: metadata?.attempts,
      })
      .eq('id', id);
  }
  
  async findDuplicates(imageHash: string): Promise<RawReceiptData[]> {
    const { data, error } = await this.supabase
      .from('raw_receipts')
      .select('*')
      .eq('image_hash', imageHash)
      .order('created_at', { ascending: false });
    
    if (error || !data) return [];
    return data.map(this.mapFromDB);
  }
  
  async getByUser(userEmail: string, limit = 50): Promise<RawReceiptData[]> {
    const { data, error } = await this.supabase
      .from('raw_receipts')
      .select('*')
      .eq('user_email', userEmail)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error || !data) return [];
    return data.map(this.mapFromDB);
  }
  
  async getByStore(storeId: string, limit = 100): Promise<RawReceiptData[]> {
    const { data, error } = await this.supabase
      .from('raw_receipts')
      .select('*')
      .eq('recognized_store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error || !data) return [];
    return data.map(this.mapFromDB);
  }
  
  async getUnprocessed(limit = 10): Promise<RawReceiptData[]> {
    const { data, error } = await this.supabase
      .from('raw_receipts')
      .select('*')
      .eq('processing_status', 'raw')
      .order('created_at', { ascending: true })
      .limit(limit);
    
    if (error || !data) return [];
    return data.map(this.mapFromDB);
  }
  
  /**
   * Export raw receipt data to SQL-like text format
   * This creates a human-readable dump of all data for AI analysis
   */
  async exportToText(id: string): Promise<string> {
    const receipt = await this.get(id);
    if (!receipt) throw new Error('Receipt not found');
    
    const lines: string[] = [];
    
    lines.push('-- ========================================');
    lines.push(`-- RAW RECEIPT DATA EXPORT`);
    lines.push(`-- Receipt ID: ${receipt.id}`);
    lines.push(`-- Created: ${new Date().toISOString()}`);
    lines.push('-- ========================================');
    lines.push('');
    
    // Basic metadata
    lines.push('-- METADATA');
    lines.push(`INSERT INTO receipt_metadata (id, user_email, captured_at, image_url) VALUES (`);
    lines.push(`  '${receipt.id}',`);
    lines.push(`  '${receipt.userEmail}',`);
    lines.push(`  '${receipt.capturedAt || new Date()}',`);
    lines.push(`  '${receipt.imageUrl}'`);
    lines.push(');');
    lines.push('');
    
    // Location data
    if (receipt.latitude && receipt.longitude) {
      lines.push('-- LOCATION');
      lines.push(`INSERT INTO receipt_location (receipt_id, latitude, longitude, accuracy_meters) VALUES (`);
      lines.push(`  '${receipt.id}',`);
      lines.push(`  ${receipt.latitude},`);
      lines.push(`  ${receipt.longitude},`);
      lines.push(`  ${receipt.locationAccuracyMeters || 0}`);
      lines.push(');');
      lines.push('');
    }
    
    // QR Code data
    if (receipt.rawQrData) {
      lines.push('-- QR CODE DATA');
      lines.push(`-- Raw Text: ${receipt.rawQrData.rawText || 'N/A'}`);
      lines.push('INSERT INTO qr_data (receipt_id, field, value) VALUES');
      
      const qrEntries: string[] = [];
      for (const [key, value] of Object.entries(receipt.rawQrData)) {
        if (key !== 'rawText' && value) {
          qrEntries.push(`  ('${receipt.id}', '${key}', '${String(value).replace(/'/g, "''")}')`);
        }
      }
      lines.push(qrEntries.join(',\n'));
      lines.push(';');
      lines.push('');
    }
    
    // OCR Text (complete dump)
    if (receipt.rawOcrText) {
      lines.push('-- OCR TEXT (Complete Receipt Text)');
      lines.push('/*');
      lines.push(receipt.rawOcrText);
      lines.push('*/');
      lines.push('');
      lines.push(`INSERT INTO ocr_text (receipt_id, full_text, char_count) VALUES (`);
      lines.push(`  '${receipt.id}',`);
      lines.push(`  '${receipt.rawOcrText.replace(/'/g, "''")}',`);
      lines.push(`  ${receipt.rawOcrText.length}`);
      lines.push(');');
      lines.push('');
    }
    
    // KRA Data
    if (receipt.rawKraData) {
      lines.push('-- KRA VERIFICATION DATA');
      lines.push('INSERT INTO kra_data (receipt_id, field, value) VALUES');
      
      const kraEntries: string[] = [];
      for (const [key, value] of Object.entries(receipt.rawKraData)) {
        if (value) {
          kraEntries.push(`  ('${receipt.id}', '${key}', '${String(value).replace(/'/g, "''")}')`);
        }
      }
      lines.push(kraEntries.join(',\n'));
      lines.push(';');
      lines.push('');
    }
    
    // Gemini/AI Data
    if (receipt.rawGeminiData) {
      lines.push('-- AI VISION EXTRACTION DATA');
      lines.push('INSERT INTO ai_data (receipt_id, field, value, confidence) VALUES');
      
      const aiEntries: string[] = [];
      for (const [key, value] of Object.entries(receipt.rawGeminiData)) {
        if (value && key !== 'confidence') {
          const confidence = receipt.rawGeminiData.confidence || 0;
          aiEntries.push(`  ('${receipt.id}', '${key}', '${String(value).replace(/'/g, "''")}', ${confidence})`);
        }
      }
      lines.push(aiEntries.join(',\n'));
      lines.push(';');
      lines.push('');
    }
    
    // Store recognition
    if (receipt.recognizedStoreId) {
      lines.push('-- STORE RECOGNITION');
      lines.push(`INSERT INTO store_recognition (receipt_id, store_id, confidence) VALUES (`);
      lines.push(`  '${receipt.id}',`);
      lines.push(`  '${receipt.recognizedStoreId}',`);
      lines.push(`  ${receipt.recognitionConfidence || 0}`);
      lines.push(');');
      lines.push('');
    }
    
    lines.push('-- ========================================');
    lines.push('-- END OF EXPORT');
    lines.push('-- ========================================');
    
    return lines.join('\n');
  }
  
  /**
   * Map database row to RawReceiptData
   */
  private mapFromDB(row: any): RawReceiptData {
    return {
      id: row.id,
      userEmail: row.user_email,
      workspaceId: row.workspace_id,
      imageUrl: row.image_url,
      imageHash: row.image_hash,
      rawQrData: row.raw_qr_data,
      rawOcrText: row.raw_ocr_text,
      rawKraData: row.raw_kra_data,
      rawGeminiData: row.raw_gemini_data,
      fileSizeBytes: row.file_size_bytes,
      imageWidth: row.image_width,
      imageHeight: row.image_height,
      mimeType: row.mime_type,
      latitude: row.latitude,
      longitude: row.longitude,
      locationAccuracyMeters: row.location_accuracy_meters,
      capturedAt: row.captured_at ? new Date(row.captured_at) : undefined,
      processingStatus: row.processing_status,
      processingAttempts: row.processing_attempts,
      lastProcessedAt: row.last_processed_at ? new Date(row.last_processed_at) : undefined,
      recognizedStoreId: row.recognized_store_id,
      recognitionConfidence: row.recognition_confidence,
    };
  }
}

// Export singleton
export const rawReceiptStorage = new SupabaseRawReceiptStorage();
