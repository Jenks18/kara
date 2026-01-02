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

      // Extract data from table rows (KRA uses label-value pairs)
      const data: Record<string, string> = {};

      $('tr').each((_, row) => {
        const cells = $(row).find('td');

        // KRA uses 2 or 4 column layout
        if (cells.length === 2) {
          const label = $(cells[0]).text().trim();
          const value = $(cells[1]).text().trim();
          if (label && value) {
            data[label] = value;
          }
        } else if (cells.length === 4) {
          // Two label-value pairs per row
          const label1 = $(cells[0]).text().trim();
          const value1 = $(cells[1]).text().trim();
          const label2 = $(cells[2]).text().trim();
          const value2 = $(cells[3]).text().trim();

          if (label1 && value1) data[label1] = value1;
          if (label2 && value2) data[label2] = value2;
        }
      });

      // Validate we got real data
      if (!data['Control Unit Invoice Number'] && !data['Supplier Name']) {
        throw new Error('KRA page returned no invoice data');
      }

      console.log('✓ KRA data extracted:', Object.keys(data));

      return {
        invoiceNumber: data['Control Unit Invoice Number'] || '',
        traderInvoiceNo: data['Trader System Invoice No'] || '',
        invoiceDate: data['Invoice Date'] || '',
        merchantName: data['Supplier Name'] || '',
        totalAmount: parseFloat(
          (data['Total Invoice Amount'] || '0').replace(/[^\d.]/g, '')
        ),
        taxableAmount: parseFloat(
          (data['Total Taxable Amount'] || '0').replace(/[^\d.]/g, '')
        ),
        vatAmount: parseFloat(
          (data['Total Tax Amount'] || '0').replace(/[^\d.]/g, '')
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
