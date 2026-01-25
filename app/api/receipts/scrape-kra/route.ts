import { NextRequest, NextResponse } from 'next/server';
import { scrapeKRAInvoice } from '@/lib/receipt-processing/kra-scraper';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
    }

    // Validate it's a KRA URL
    if (!url.includes('kra.go.ke')) {
      return NextResponse.json({ error: 'Not a valid KRA URL' }, { status: 400 });
    }

    console.log('Scraping KRA invoice:', url);

    const invoiceData = await scrapeKRAInvoice(url);

    if (!invoiceData) {
      return NextResponse.json(
        { error: 'Failed to scrape invoice data' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: invoiceData,
    });
  } catch (error) {
    console.error('KRA scraping error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
