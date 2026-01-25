/**
 * KRA E-INVOICE SCRAPER
 * 
 * Backend-only module for scraping KRA receipt data
 * Works with URLs extracted from QR codes
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

export interface KRAInvoiceData {
  invoiceNumber?: string;
  traderInvoiceNo?: string;
  invoiceDate?: string;
  merchantName?: string;
  totalAmount?: number;
  taxableAmount?: number;
  vatAmount?: number;
  verified: boolean;
  scrapedAt: string;
  error?: string;
}

/**
 * Check if URL is a KRA e-invoice
 */
export function isKRAUrl(url: string): boolean {
  return url.includes('itax.kra.go.ke') || url.includes('kra.go.ke');
}

/**
 * Scrape KRA invoice data from URL
 * 
 * Note: This runs on the BACKEND only
 * Do not call from client-side code
 */
export async function scrapeKRAInvoice(url: string): Promise<KRAInvoiceData> {
  const result: KRAInvoiceData = {
    verified: false,
    scrapedAt: new Date().toISOString(),
  };

  try {
    // Fetch the KRA page
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      },
    });

    const $ = cheerio.load(response.data);

    // Extract invoice data from table rows
    // KRA uses a consistent table format
    $('table tr').each((_, row) => {
      const label = $(row).find('td:first-child').text().trim().toLowerCase();
      const value = $(row).find('td:last-child').text().trim();

      if (label.includes('invoice number') || label.includes('cu invoice')) {
        result.invoiceNumber = value;
      } else if (label.includes('trader invoice')) {
        result.traderInvoiceNo = value;
      } else if (label.includes('date')) {
        result.invoiceDate = value;
      } else if (label.includes('merchant') || label.includes('trader name')) {
        result.merchantName = value;
      } else if (label.includes('total amount')) {
        result.totalAmount = parseAmount(value);
      } else if (label.includes('taxable amount') || label.includes('net amount')) {
        result.taxableAmount = parseAmount(value);
      } else if (label.includes('vat') || label.includes('tax amount')) {
        result.vatAmount = parseAmount(value);
      }
    });

    // If we found key data, mark as verified
    if (result.invoiceNumber && result.totalAmount) {
      result.verified = true;
    }

    return result;
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Scraping failed';
    return result;
  }
}

/**
 * Parse amount string to number
 */
function parseAmount(value: string): number | undefined {
  // Remove currency symbols, commas, and spaces
  const cleaned = value.replace(/[KES,\s]/gi, '').trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? undefined : parsed;
}
