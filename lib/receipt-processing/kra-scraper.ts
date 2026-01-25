import axios from 'axios';
import * as cheerio from 'cheerio';

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

export async function scrapeKRAInvoice(
  qrUrl: string,
  maxRetries = 3
): Promise<KRAInvoiceData | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Add delay on retries to respect KRA servers
      if (attempt > 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
      }

      console.log(`Attempt ${attempt}: Fetching ${qrUrl}`);

      const response = await axios.get(qrUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'keep-alive',
        },
        timeout: 15000,
        maxRedirects: 5,
      });

      const $ = cheerio.load(response.data);

      // Get the full text content
      const fullText = $('body').text();

      // Extract data using regex patterns (more reliable than table parsing)
      const patterns = {
        invoiceNumber: /Control Unit Invoice Number\s+(\S+)/,
        traderInvoiceNo: /Trader System Invoice No\s+(\S+)/,
        invoiceDate: /Invoice Date\s+([\d\/]+)/,
        totalTaxableAmount: /Total Taxable Amount\s+([\d.,]+)/,
        totalTaxAmount: /Total Tax Amount\s+([\d.,]+)/,
        totalInvoiceAmount: /Total Invoice Amount\s+([\d.,]+)/,
        supplierName: /Supplier Name\s+([^\n]+)/,
      };

      const extractedData: Record<string, string> = {};
      for (const [key, pattern] of Object.entries(patterns)) {
        const match = fullText.match(pattern);
        if (match) {
          extractedData[key] = match[1].trim();
        }
      }

      // Validate we got real data
      if (!extractedData.invoiceNumber && !extractedData.supplierName) {
        throw new Error('KRA page returned no invoice data');
      }

      console.log('✓ KRA data extracted:', Object.keys(extractedData));

      return {
        invoiceNumber: extractedData.invoiceNumber || '',
        traderInvoiceNo: extractedData.traderInvoiceNo || '',
        invoiceDate: extractedData.invoiceDate || '',
        merchantName: extractedData.supplierName || '',
        totalAmount: parseFloat(
          (extractedData.totalInvoiceAmount || '0').replace(/[^\d.]/g, '')
        ),
        taxableAmount: parseFloat(
          (extractedData.totalTaxableAmount || '0').replace(/[^\d.]/g, '')
        ),
        vatAmount: parseFloat(
          (extractedData.totalTaxAmount || '0').replace(/[^\d.]/g, '')
        ),
        verified: true,
        scrapedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error(`KRA scrape attempt ${attempt} failed:`, error.message);

      if (attempt === maxRetries) {
        console.error('KRA scraping failed after all retries');
        return null;
      }
    }
  }

  return null;
}
