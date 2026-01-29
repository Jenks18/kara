import { NextRequest, NextResponse } from 'next/server';
import { decodeQRFromImage, type QRCodeData } from '@/lib/receipt-processing/qr-decoder';
import { scrapeKRAInvoice } from '@/lib/receipt-processing/kra-scraper';
import { extractWithTesseract, type ReceiptOCRResult } from '@/lib/receipt-processing/ocr-free';
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


    // Convert to buffer
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());

    // ============================================
    // DATA SOURCE 1: QR CODE (Structured Data)
    // ============================================
    let qrData: QRCodeData;
    let kraData = null;
    
    try {
      qrData = await decodeQRFromImage(imageBuffer);
        hasURL: !!qrData.url,
        hasInvoice: !!qrData.invoiceNumber,
        hasMerchant: !!qrData.merchantName,
        hasAmount: !!qrData.totalAmount,
      });
      
      // If QR contains a URL, try to scrape additional data from KRA
      if (qrData.url) {
        kraData = await scrapeKRAInvoice(qrData.url);
        if (kraData) {
            merchant: kraData.merchantName,
            amount: kraData.totalAmount,
            invoice: kraData.invoiceNumber,
          });
        }
      }
    } catch (error) {
      return NextResponse.json(
        {
          error: 'No QR code found',
          message: 'Could not find QR code on receipt. Please ensure the QR code is visible and clear.',
        },
        { status: 400 }
      );
    }

    // ============================================
    // DATA SOURCE 2: RECEIPT IMAGE (Visual OCR)
    // ============================================
    let receiptData = await extractWithTesseract(imageBuffer);

      merchant: receiptData.merchantName,
      amount: receiptData.totalAmount,
      litres: receiptData.litres,
      confidence: receiptData.confidence,
    });

    // Try Gemini if Tesseract confidence is low and we have QR/KRA data to help
    if (receiptData.confidence < 60 && (qrData.totalAmount || kraData)) {
      try {
        const geminiResult = await extractWithGemini(imageBuffer, kraData || {
          merchantName: qrData.merchantName || '',
          totalAmount: qrData.totalAmount || 0,
          invoiceDate: qrData.dateTime || '',
          invoiceNumber: qrData.invoiceNumber || '',
        } as any);
        
        // Merge Gemini fuel data with receipt OCR
        receiptData = {
          ...receiptData,
          litres: geminiResult.litres || receiptData.litres,
          fuelType: geminiResult.fuelType || receiptData.fuelType,
          pricePerLitre: geminiResult.pricePerLitre || receiptData.pricePerLitre,
          pumpNumber: geminiResult.pumpNumber || receiptData.pumpNumber,
          vehicleNumber: geminiResult.vehicleNumber || receiptData.vehicleNumber,
          confidence: Math.max(receiptData.confidence, geminiResult.confidence),
          source: 'tesseract_ocr + gemini_vision',
        };
        
          litres: receiptData.litres,
          confidence: receiptData.confidence,
        });
      } catch (error) {
        console.error('Gemini failed:', error);
      }
    }

    // ============================================
    // MERGE DATA SOURCES (QR + KRA + OCR)
    // ============================================
    const transaction = {
      // QR Code Data (100% confidence if present)
      qrData: {
        invoiceNumber: qrData.invoiceNumber,
        merchantPIN: qrData.merchantPIN,
        merchantName: qrData.merchantName,
        totalAmount: qrData.totalAmount,
        dateTime: qrData.dateTime,
        tillNumber: qrData.tillNumber,
        receiptNumber: qrData.receiptNumber,
        rawQRText: qrData.rawText,
        source: 'qr_code',
        confidence: 100,
      },
      
      // KRA Website Data (100% confidence if scraped)
      kraData: kraData ? {
        invoiceNumber: kraData.invoiceNumber,
        traderInvoiceNo: kraData.traderInvoiceNo,
        merchantName: kraData.merchantName,
        totalAmount: kraData.totalAmount,
        taxableAmount: kraData.taxableAmount,
        vatAmount: kraData.vatAmount,
        invoiceDate: kraData.invoiceDate,
        verified: kraData.verified,
        source: 'kra_website',
        confidence: 100,
      } : null,
      
      // Receipt OCR Data (variable confidence)
      receiptData: {
        merchantName: receiptData.merchantName,
        location: receiptData.location,
        totalAmount: receiptData.totalAmount,
        subtotal: receiptData.subtotal,
        vatAmount: receiptData.vatAmount,
        litres: receiptData.litres,
        fuelType: receiptData.fuelType,
        pricePerLitre: receiptData.pricePerLitre,
        pumpNumber: receiptData.pumpNumber,
        attendantName: receiptData.attendantName,
        vehicleNumber: receiptData.vehicleNumber,
        transactionDate: receiptData.transactionDate,
        transactionTime: receiptData.transactionTime,
        source: receiptData.source,
        confidence: receiptData.confidence,
      },
      
      // Merged "best guess" transaction
      mergedTransaction: {
        // Prefer KRA > QR > OCR for financial data
        invoiceNumber: kraData?.invoiceNumber || qrData.invoiceNumber || null,
        merchantName: kraData?.merchantName || qrData.merchantName || receiptData.merchantName,
        totalAmount: kraData?.totalAmount || qrData.totalAmount || receiptData.totalAmount,
        vatAmount: kraData?.vatAmount || receiptData.vatAmount || null,
        date: kraData?.invoiceDate || qrData.dateTime || receiptData.transactionDate,
        time: receiptData.transactionTime,
        
        // Only from OCR
        litres: receiptData.litres,
        fuelType: receiptData.fuelType,
        pricePerLitre: receiptData.pricePerLitre,
        pumpNumber: receiptData.pumpNumber,
        attendantName: receiptData.attendantName,
        vehicleNumber: receiptData.vehicleNumber,
        location: receiptData.location,
        
        // Status determination
        status: (receiptData.litres && receiptData.confidence > 70) ? 'verified' : 'needs_review',
        overallConfidence: Math.round(
          (100 + // QR always 100%
           (kraData ? 100 : 0) + // KRA 100% if available
           receiptData.confidence) / (kraData ? 3 : 2) // Average
        ),
      },
      
      processedAt: new Date().toISOString(),
    };

      qrFound: true,
      kraVerified: !!kraData,
      ocrConfidence: receiptData.confidence,
      overallStatus: transaction.mergedTransaction.status,
    });

    return NextResponse.json({
      success: true,
      transaction,
      processing: {
        qrDecoded: true,
        qrHasStructuredData: !!(qrData.invoiceNumber || qrData.totalAmount),
        kraVerified: !!kraData,
        ocrMethod: receiptData.source,
        ocrConfidence: receiptData.confidence,
        overallConfidence: transaction.mergedTransaction.overallConfidence,
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
