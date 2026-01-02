import { NextRequest, NextResponse } from 'next/server';
import { decodeQRFromImage } from '@/lib/receipt-processing/qr-decoder';
import { scrapeKRAInvoice } from '@/lib/receipt-processing/kra-scraper';
import { extractWithTesseract } from '@/lib/receipt-processing/ocr-free';
import { extractWithGemini } from '@/lib/receipt-processing/ocr-ai';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    console.log('📸 Processing receipt:', imageFile.name);

    // Convert to buffer
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());

    // Step 1: Decode QR code
    console.log('📱 Step 1: Decoding QR code...');
    let qrUrl: string;
    try {
      qrUrl = await decodeQRFromImage(imageBuffer);
      console.log('✓ QR decoded:', qrUrl);
    } catch (error) {
      return NextResponse.json(
        {
          error: 'No QR code found',
          message: 'Could not find KRA QR code on receipt. Please ensure the QR code is visible and clear.',
        },
        { status: 400 }
      );
    }

    // Step 2: Scrape KRA website
    console.log('🌐 Step 2: Verifying with KRA...');
    const kraData = await scrapeKRAInvoice(qrUrl);

    if (!kraData) {
      return NextResponse.json(
        {
          error: 'KRA verification failed',
          message: 'Could not verify invoice with KRA. The invoice may be invalid or KRA servers are down.',
        },
        { status: 400 }
      );
    }

    console.log('✓ KRA verified:', {
      merchant: kraData.merchantName,
      amount: kraData.totalAmount,
      invoice: kraData.invoiceNumber,
    });

    // Step 3: Try Tesseract OCR (free)
    console.log('🔍 Step 3: Extracting fuel data with Tesseract...');
    let fuelData = await extractWithTesseract(imageBuffer, kraData.totalAmount);

    console.log('Tesseract result:', {
      litres: fuelData.litres,
      confidence: fuelData.confidence,
      source: fuelData.source,
    });

    // Step 4: If Tesseract confidence is low, try Gemini
    if (fuelData.confidence < 80) {
      console.log('⚠️ Tesseract confidence low, trying Gemini AI...');
      try {
        fuelData = await extractWithGemini(imageBuffer, kraData);
        console.log('✓ Gemini result:', {
          litres: fuelData.litres,
          confidence: fuelData.confidence,
        });
      } catch (error) {
        console.error('Gemini failed:', error);
        // Continue with Tesseract results
      }
    }

    // Combine results
    const transaction = {
      // From KRA (100% confidence)
      invoiceNumber: kraData.invoiceNumber,
      merchantName: kraData.merchantName,
      totalAmount: kraData.totalAmount,
      invoiceDate: kraData.invoiceDate,
      vatAmount: kraData.vatAmount,

      // From OCR (variable confidence)
      litres: fuelData.litres,
      fuelType: fuelData.fuelType,
      pricePerLitre: fuelData.pricePerLitre,
      pumpNumber: fuelData.pumpNumber,
      vehicleNumber: fuelData.vehicleNumber,

      // Processing metadata
      confidence: fuelData.confidence,
      ocrSource: fuelData.source,
      status: fuelData.confidence > 80 ? 'verified' : 'needs_review',
      processedAt: new Date().toISOString(),
    };

    console.log('✅ Processing complete:', {
      status: transaction.status,
      confidence: transaction.confidence,
    });

    return NextResponse.json({
      success: true,
      transaction,
      processing: {
        qrDecoded: true,
        kraVerified: true,
        ocrMethod: fuelData.source,
        confidence: fuelData.confidence,
      },
    });
  } catch (error: any) {
    console.error('❌ Processing error:', error);
    return NextResponse.json(
      {
        error: 'Processing failed',
        message: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
