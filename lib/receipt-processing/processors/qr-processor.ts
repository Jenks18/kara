/**
 * QR CODE PROCESSOR MODULE
 * 
 * Fully decoupled processor for QR code extraction and processing
 * Works independently from other receipt processing modules
 * 
 * Pipeline:
 * 1. Scan image for QR codes
 * 2. Decode QR code data
 * 3. If URL detected, fetch external data (e.g., KRA invoice)
 * 4. Return structured QR data
 */

import { BrowserQRCodeReader } from '@zxing/library';
import axios from 'axios';
import * as cheerio from 'cheerio';

export interface QRProcessorResult {
  found: boolean;
  rawText?: string;
  dataType: 'url' | 'structured' | 'plain' | null;
  url?: string;
  scrapedData?: KRAInvoiceData;
  parsedFields?: Record<string, any>;
  timestamp: string;
}

export interface KRAInvoiceData {
  invoiceNumber: string;
  traderInvoiceNo: string;
  invoiceDate: string;
  merchantName: string;
  totalAmount: number;
  taxableAmount: number;
  vatAmount: number;
  verified: boolean;
  scrapedAt: string;
}

export class QRCodeProcessor {
  private reader: BrowserQRCodeReader;

  constructor() {
    this.reader = new BrowserQRCodeReader();
  }

  /**
   * Main processing method - scans image for QR code and extracts all data
   */
  async process(imageBuffer: Buffer): Promise<QRProcessorResult> {
    try {
      // Step 1: Decode QR code from image
      const qrText = await this.decodeQR(imageBuffer);
      
      if (!qrText) {
        return {
          found: false,
          dataType: null,
          timestamp: new Date().toISOString(),
        };
      }

      // Step 2: Determine QR code type
      const dataType = this.detectDataType(qrText);

      // Step 3: Process based on type
      const result: QRProcessorResult = {
        found: true,
        rawText: qrText,
        dataType,
        timestamp: new Date().toISOString(),
      };

      if (dataType === 'url') {
        result.url = qrText;
        
        // If it's a KRA URL, scrape the invoice data
        if (this.isKRAUrl(qrText)) {
          result.scrapedData = await this.scrapeKRA(qrText);
        }
      } else if (dataType === 'structured') {
        result.parsedFields = this.parseStructuredData(qrText);
      }

      return result;
    } catch (error: any) {
      console.error('QR Processor error:', error.message);
      return {
        found: false,
        dataType: null,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Decode QR code from image buffer
   */
  private async decodeQR(imageBuffer: Buffer): Promise<string | null> {
    try {
      const base64 = imageBuffer.toString('base64');
      const dataUrl = `data:image/jpeg;base64,${base64}`;
      
      const result = await this.reader.decodeFromImageUrl(dataUrl);
      return result.getText();
    } catch {
      return null;
    }
  }

  /**
   * Detect the type of data in QR code
   */
  private detectDataType(text: string): 'url' | 'structured' | 'plain' {
    if (text.startsWith('http://') || text.startsWith('https://')) {
      return 'url';
    }
    
    // Check for structured data (JSON or key-value pairs)
    if (text.includes('=') || text.includes(':') || text.startsWith('{')) {
      return 'structured';
    }
    
    return 'plain';
  }

  /**
   * Check if URL is a KRA invoice URL
   */
  private isKRAUrl(url: string): boolean {
    return url.includes('itax.kra.go.ke');
  }

  /**
   * Scrape KRA invoice data from URL
   */
  private async scrapeKRA(url: string): Promise<KRAInvoiceData | null> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
        timeout: 15000,
      });

      const $ = cheerio.load(response.data);
      const data: Record<string, string> = {};

      // Extract table data
      $('tr').each((_, row) => {
        const cells = $(row).find('td');
        
        if (cells.length === 2) {
          const label = $(cells[0]).text().trim();
          const value = $(cells[1]).text().trim();
          if (label && value) data[label] = value;
        } else if (cells.length === 4) {
          const label1 = $(cells[0]).text().trim();
          const value1 = $(cells[1]).text().trim();
          const label2 = $(cells[2]).text().trim();
          const value2 = $(cells[3]).text().trim();
          
          if (label1 && value1) data[label1] = value1;
          if (label2 && value2) data[label2] = value2;
        }
      });

      return {
        invoiceNumber: data['Control Unit Invoice Number'] || '',
        traderInvoiceNo: data['Trader System Invoice No'] || '',
        invoiceDate: data['Invoice Date'] || '',
        merchantName: data['Supplier Name'] || '',
        totalAmount: parseFloat((data['Total Invoice Amount'] || '0').replace(/[^\d.]/g, '')),
        taxableAmount: parseFloat((data['Total Taxable Amount'] || '0').replace(/[^\d.]/g, '')),
        vatAmount: parseFloat((data['Total Tax Amount'] || '0').replace(/[^\d.]/g, '')),
        verified: true,
        scrapedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('KRA scraping failed:', error);
      return null;
    }
  }

  /**
   * Parse structured QR data (JSON or key-value pairs)
   */
  private parseStructuredData(text: string): Record<string, any> {
    try {
      // Try JSON first
      return JSON.parse(text);
    } catch {
      // Try key-value format (INV=123,AMT=5000)
      const data: Record<string, any> = {};
      const pairs = text.split(/[,;|]/);
      
      for (const pair of pairs) {
        const [key, value] = pair.split(/[=:]/);
        if (key && value) {
          data[key.trim()] = value.trim();
        }
      }
      
      return data;
    }
  }
}

// Export singleton instance
export const qrProcessor = new QRCodeProcessor();
