import { NextRequest, NextResponse } from 'next/server';
import { scrapeKRAInvoice } from '@/lib/receipt-processing/kra-scraper';

interface GoogleVisionTextAnnotation {
  description?: string;
  locale?: string;
}

interface GoogleVisionBarcodeInfo {
  type?: string;
  value?: string;
}

interface GoogleVisionAnnotation {
  description?: string;
  barcodeValue?: string;
  boundingPoly?: any;
}

interface GoogleVisionResponse {
  responses: Array<{
    textAnnotations?: GoogleVisionTextAnnotation[];
    fullTextAnnotation?: {
      text: string;
    };
    barcodeAnnotations?: Array<{
      description?: string;
      barcodeValue?: string;
      boundingPoly?: any;
    }>;
  }>;
}

export async function POST(req: NextRequest) {
  try {
    const { imageData } = await req.json();

    if (!imageData) {
      return NextResponse.json({ error: 'No image data provided' }, { status: 400 });
    }

    // Check for API key at runtime, not build time
    const GOOGLE_VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY;
    if (!GOOGLE_VISION_API_KEY) {
      return NextResponse.json(
        { 
          error: 'Google Vision API key not configured',
          message: 'GOOGLE_VISION_API_KEY environment variable is missing'
        }, 
        { status: 500 }
      );
    }

    const VISION_API_URL = `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`;

    // Remove data URL prefix if present
    const base64Image = imageData.includes(',') 
      ? imageData.split(',')[1] 
      : imageData;

    console.log('Processing with Google Vision API...');

    // Call Google Vision API for both text detection and barcode detection
    const visionResponse = await fetch(VISION_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: base64Image,
            },
            features: [
              {
                type: 'TEXT_DETECTION',
                maxResults: 1,
              },
              {
                type: 'DOCUMENT_TEXT_DETECTION',
                maxResults: 1,
              },
              {
                type: 'BARCODE_DETECTION',
                maxResults: 20,
              },
            ],
            imageContext: {
              // Hint to Vision API to look for various barcode formats
              barcodeHints: [
                'QR_CODE',
                'DATA_MATRIX',
                'CODE_128',
                'CODE_39',
                'EAN_13',
                'EAN_8'
              ]
            }
          },
        ],
      }),
    });

    if (!visionResponse.ok) {
      const error = await visionResponse.text();
      console.error('Google Vision API error:', error);
      
      // Return helpful error message with setup instructions
      return NextResponse.json({
        error: 'Google Vision API not enabled',
        message: 'Cloud Vision API needs to be enabled in Google Cloud Console',
        instructions: [
          '1. Visit: https://console.developers.google.com/apis/api/vision.googleapis.com/overview?project=189716705778',
          '2. Click "Enable API"',
          '3. Make sure billing is enabled (free tier available)',
          '4. Wait a few minutes for changes to propagate'
        ],
        status: visionResponse.status,
        details: error
      }, { status: 503 });
    }

    const visionData: GoogleVisionResponse = await visionResponse.json();
    const result = visionData.responses[0];

    // Extract OCR text
    const fullText = result.fullTextAnnotation?.text || '';
    const textAnnotations = result.textAnnotations || [];
    const firstAnnotation = textAnnotations[0];

    // Extract QR codes / barcodes with enhanced logging
    const barcodes = result.barcodeAnnotations || [];
    console.log(`Found ${barcodes.length} barcodes/QR codes`);
    if (barcodes.length > 0) {
      console.log('Barcode details:', JSON.stringify(barcodes, null, 2));
    }

    const qrCodes = barcodes
      .filter((barcode) => barcode.description || barcode.barcodeValue)
      .map((barcode) => {
        const data = barcode.barcodeValue || barcode.description || '';
        const isKRA = data.toLowerCase().includes('kra.go.ke');
        const isUrl = data.startsWith('http');

        console.log(`Detected barcode: ${data.substring(0, 100)}... (KRA: ${isKRA}, URL: ${isUrl})`);

        return {
          data,
          url: isUrl ? data : null,
          is_kra: isKRA,
          type: 'QR_CODE',
          position: barcode.boundingPoly,
        };
      });

    // Parse basic fields from text
    const extractedFields = parseReceiptFields(fullText);

    // Build response
    const response: any = {
      success: true,
      source: 'google-vision',
      ocr: {
        full_text: fullText,
        confidence: firstAnnotation ? 95 : 0, // Google Vision doesn't provide confidence, estimate high
        lines: fullText.split('\n').filter((line) => line.trim()),
      },
      qr_codes: qrCodes,
      extracted_fields: extractedFields,
      processing_notes: [
        'Processed with Google Cloud Vision API',
        `Found ${qrCodes.length} QR code(s)`,
      ],
    };

    // If KRA QR code found, scrape the invoice data
    const kraQR = qrCodes.find((qr) => qr.is_kra && qr.url);
    if (kraQR && kraQR.url) {
      console.log('KRA QR detected, scraping invoice data...');
      try {
        const kraData = await scrapeKRAInvoice(kraQR.url);
        if (kraData) {
          response.kra_data = kraData;
          response.processing_notes.push('KRA invoice data scraped successfully');
        }
      } catch (error) {
        console.error('KRA scraping error:', error);
        response.processing_notes.push('KRA scraping failed');
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Processing error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

function parseReceiptFields(text: string): any {
  const fields: any = {};

  // Extract merchant name (usually at the top)
  const lines = text.split('\n').filter((line) => line.trim());
  if (lines.length > 0) {
    fields.merchantName = lines[0];
  }

  // Extract total amount
  const totalPatterns = [
    /total[:\s]*(?:kes|ksh)?\s*([\d,]+\.?\d*)/i,
    /amount[:\s]*(?:kes|ksh)?\s*([\d,]+\.?\d*)/i,
    /grand\s+total[:\s]*(?:kes|ksh)?\s*([\d,]+\.?\d*)/i,
  ];

  for (const pattern of totalPatterns) {
    const match = text.match(pattern);
    if (match) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(amount)) {
        fields.totalAmount = amount;
        break;
      }
    }
  }

  // Extract date
  const datePatterns = [
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
    /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      fields.date = match[1];
      break;
    }
  }

  return fields;
}
