/**
 * QR CODE DATA STORAGE MODULE
 * 
 * Handles persistence of QR processor results to database
 * Decoupled from other receipt processors
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { KRAInvoiceData } from '@/lib/qr-scanner/kra-scraper';

export interface SaveQRDataParams {
  userId: string;
  userEmail: string;
  receiptImageUrl: string;
  receiptId?: string;
  qrUrl: string;
  qrRawData: string;
  kraData?: KRAInvoiceData;
  processingTimeMs?: number;
}

export class QRDataStorage {
  /**
   * Save QR data and scraped results to database
   */
  async save(
    params: SaveQRDataParams,
    supabase: SupabaseClient
  ): Promise<string | null> {
    const { userId, userEmail, receiptImageUrl, receiptId, qrUrl, qrRawData, kraData, processingTimeMs } = params;

    try {
      const isKRA = qrUrl.includes('itax.kra.go.ke');
      
      const { data, error } = await supabase
        .from('qr_code_data')
        .insert({
          user_id: userId,
          user_email: userEmail,
          receipt_image_url: receiptImageUrl,
          receipt_id: receiptId,
          
          // QR content
          raw_text: qrRawData,
          data_type: 'url',
          
          // URL data
          url: qrUrl,
          is_kra_url: isKRA,
          
          // KRA scraped data (if available)
          kra_invoice_number: kraData?.invoiceNumber,
          kra_trader_invoice_no: kraData?.traderInvoiceNo,
          kra_invoice_date: kraData?.invoiceDate,
          kra_merchant_name: kraData?.merchantName,
          kra_total_amount: kraData?.totalAmount,
          kra_taxable_amount: kraData?.taxableAmount,
          kra_vat_amount: kraData?.vatAmount,
          kra_verified: kraData?.verified ?? false,
          kra_scraped_at: kraData?.scrapedAt,
          
          // Metadata
          processed_at: new Date().toISOString(),
          processing_time_ms: processingTimeMs,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Failed to save QR data:', error);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('QR data storage error:', error);
      return null;
    }
  }

  /**
   * Get QR data by ID
   */
  async getById(id: string, supabase: SupabaseClient) {
    const { data, error } = await supabase
      .from('qr_code_data')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Failed to get QR data:', error);
      return null;
    }

    return data;
  }

  /**
   * Get QR data by receipt ID
   */
  async getByReceiptId(receiptId: string, supabase: SupabaseClient) {
    const { data, error } = await supabase
      .from('qr_code_data')
      .select('*')
      .eq('receipt_id', receiptId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to get QR data by receipt:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get KRA invoices for user
   */
  async getKRAInvoices(userEmail: string, supabase: SupabaseClient, limit = 50) {
    const { data, error } = await supabase
      .from('qr_code_data')
      .select('*')
      .eq('user_email', userEmail)
      .eq('is_kra_url', true)
      .not('kra_invoice_number', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to get KRA invoices:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Search by KRA invoice number
   */
  async findByInvoiceNumber(invoiceNumber: string, supabase: SupabaseClient) {
    const { data, error } = await supabase
      .from('qr_code_data')
      .select('*')
      .eq('kra_invoice_number', invoiceNumber)
      .single();

    if (error) {
      return null;
    }

    return data;
  }
}

// Export singleton
export const qrStorage = new QRDataStorage();
