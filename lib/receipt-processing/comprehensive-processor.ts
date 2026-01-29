/**
 * COMPREHENSIVE RECEIPT PROCESSOR
 * 
 * Extracts EVERYTHING from a receipt:
 * - All text (OCR)
 * - Tables and line items
 * - QR codes
 * - Structure detection
 */

import { createWorker } from 'tesseract.js';
import jsQR from 'jsqr';

export interface ComprehensiveReceiptData {
  // OCR Results
  fullText: string;
  confidence: number;
  lines: Array<{
    text: string;
    confidence: number;
    bbox: { x: number; y: number; width: number; height: number };
  }>;
  
  // QR Code
  qrCode?: {
    found: boolean;
    data?: string;
    url?: string;
    position?: { x: number; y: number; width: number; height: number };
  };
  
  // Extracted fields (smart parsing)
  extractedFields?: {
    merchantName?: string;
    totalAmount?: number;
    date?: string;
    items?: Array<{ name: string; amount: number }>;
  };
  
  // Processing metadata
  processingTime: number;
  imageSize: { width: number; height: number };
}

/**
 * Process entire receipt - OCR + QR + structure extraction
 */
export async function processCompleteReceipt(
  imageBlob: Blob | File
): Promise<ComprehensiveReceiptData> {
  const startTime = Date.now();
  
  
  try {
    // Convert to ImageBitmap for parallel processing
    const imageBitmap = await createImageBitmap(imageBlob);
    const imageSize = { width: imageBitmap.width, height: imageBitmap.height };
    
    
    // Run OCR and QR detection in parallel
    const [ocrResult, qrResult] = await Promise.all([
      performOCR(imageBlob),
      detectQRCode(imageBitmap),
    ]);
    
    // Parse extracted text for structured data
    const extractedFields = parseReceiptText(ocrResult.fullText, ocrResult.lines);
    
    const processingTime = Date.now() - startTime;
    
    return {
      ...ocrResult,
      qrCode: qrResult,
      extractedFields,
      processingTime,
      imageSize,
    };
  } catch (error) {
    console.error('❌ Processing failed:', error);
    // Return minimal error result
    return {
      fullText: '',
      confidence: 0,
      lines: [],
      qrCode: { found: false },
      processingTime: Date.now() - startTime,
      imageSize: { width: 0, height: 0 },
    };
  }
}

/**
 * Perform OCR on the receipt using Tesseract
 */
async function performOCR(imageBlob: Blob | File): Promise<{
  fullText: string;
  confidence: number;
  lines: Array<{ text: string; confidence: number; bbox: any }>;
}> {
  
  try {
    const worker = await createWorker('eng', undefined, {
    });
    
    const { data } = await worker.recognize(imageBlob);
    
    
    await worker.terminate();
    
    // Extract lines from words if lines array doesn't exist
    const lines = (data as any).lines || [];
    const words = (data as any).words || [];
    
    
    return {
      fullText: data.text || '',
      confidence: data.confidence || 0,
      lines: lines.map((line: any) => ({
        text: line.text,
        confidence: line.confidence,
        bbox: line.bbox,
      })),
    };
  } catch (error) {
    console.error('❌ OCR failed:', error);
    return {
      fullText: '',
      confidence: 0,
      lines: [],
    };
  }
}

/**
 * Detect QR code in the image
 */
async function detectQRCode(imageBitmap: ImageBitmap): Promise<{
  found: boolean;
  data?: string;
  url?: string;
  position?: { x: number; y: number; width: number; height: number };
}> {
  
  try {
    const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(imageBitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    
    // Try scanning full image first
    const modes = ['attemptBoth', 'dontInvert', 'onlyInvert'] as const;
    
    for (const mode of modes) {
      try {
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: mode,
        });
        
        if (code) {
          return {
            found: true,
            data: code.data,
            url: code.data.startsWith('http') ? code.data : undefined,
            position: {
              x: code.location.topLeftCorner.x,
              y: code.location.topLeftCorner.y,
              width: code.location.bottomRightCorner.x - code.location.topLeftCorner.x,
              height: code.location.bottomRightCorner.y - code.location.topLeftCorner.y,
            },
          };
        }
      } catch (err) {
        continue;
      }
    }
    
    // Try bottom 30% region
    const bottomY = Math.floor(imageBitmap.height * 0.7);
    const bottomHeight = imageBitmap.height - bottomY;
    const bottomCanvas = new OffscreenCanvas(imageBitmap.width, bottomHeight);
    const bottomCtx = bottomCanvas.getContext('2d')!;
    bottomCtx.drawImage(imageBitmap, 0, -bottomY);
    const bottomData = bottomCtx.getImageData(0, 0, imageBitmap.width, bottomHeight);
    
    for (const mode of modes) {
      try {
        const code = jsQR(bottomData.data, bottomData.width, bottomData.height, {
          inversionAttempts: mode,
        });
        
          if (code) {
          return {
            found: true,
            data: code.data,
            url: code.data.startsWith('http') ? code.data : undefined,
            position: {
              x: code.location.topLeftCorner.x,
              y: bottomY + code.location.topLeftCorner.y,
              width: code.location.bottomRightCorner.x - code.location.topLeftCorner.x,
              height: code.location.bottomRightCorner.y - code.location.topLeftCorner.y,
            },
          };
        }
      } catch (err) {
        continue;
      }
    }
    
    return { found: false };
  } catch (error) {
    console.error('❌ QR detection failed:', error);
    return { found: false };
  }
}

/**
 * Parse OCR text to extract structured receipt data
 */
function parseReceiptText(fullText: string, lines: Array<{ text: string; confidence: number }>): {
  merchantName?: string;
  totalAmount?: number;
  date?: string;
  items?: Array<{ name: string; amount: number }>;
} {
  
  const result: any = {};
  
  // Extract merchant name (usually first few lines)
  const firstLine = lines[0]?.text || '';
  if (firstLine.length > 3 && firstLine.length < 50) {
    result.merchantName = firstLine.trim();
  }
  
  // Extract total amount (look for "TOTAL" keyword)
  const totalMatch = fullText.match(/TOTAL[:\s]+([KES\s]*)?([\d,]+\.?\d*)/i);
  if (totalMatch) {
    result.totalAmount = parseFloat(totalMatch[2].replace(/,/g, ''));
  }
  
  // Extract date (common formats)
  const dateMatch = fullText.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
  if (dateMatch) {
    result.date = dateMatch[1];
  }
  
  // Extract line items (simplified - look for amount patterns)
  const items: Array<{ name: string; amount: number }> = [];
  lines.forEach((line) => {
    const itemMatch = line.text.match(/^(.+?)\s+([\d,]+\.?\d{2})$/);
    if (itemMatch) {
      items.push({
        name: itemMatch[1].trim(),
        amount: parseFloat(itemMatch[2].replace(/,/g, '')),
      });
    }
  });
  
  if (items.length > 0) {
    result.items = items;
  }
  
  return result;
}
