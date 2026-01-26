/**
 * CLIENT-SIDE QR SCANNER
 * 
 * Web: Uses BarcodeDetector API (Android) with jsQR fallback (iOS)
 * Native: Replace with react-native-vision-camera or expo-barcode-scanner
 * 
 * Same interface for both - easy migration path
 */

import { preprocessReceiptImage } from '@/lib/receipt-processing/image-preprocessor';

// Type declaration for BarcodeDetector API
declare global {
  interface Window {
    BarcodeDetector?: any;
  }
  var BarcodeDetector: any;
}

export interface QRScanResult {
  found: boolean;
  url?: string;
  rawData?: string;
  format?: string;
  confidence?: string; // Which method found it
}

/**
 * Scan QR code from image blob (web implementation)
 * NOW WITH PREPROCESSING: Isolates QR region and enhances it
 */
export async function scanQRFromImage(imageBlob: Blob | File): Promise<QRScanResult> {
  try {
    console.log('📸 Preprocessing receipt image...');
    
    // Step 1: Preprocess - isolate and enhance QR region
    const processed = await preprocessReceiptImage(imageBlob);
    
    // Step 2: Try native BarcodeDetector on isolated QR region first
    if ('BarcodeDetector' in window && processed.qrRegion) {
      console.log('🔍 Trying BarcodeDetector on QR region...');
      const qrBlob = imageDataToBlob(processed.qrRegion);
      const detector = new BarcodeDetector({ formats: ['qr_code'] });
      const barcodes = await detector.detect(qrBlob as any);
      
      if (barcodes.length > 0) {
        const qr = barcodes[0];
        console.log('✅ Found with BarcodeDetector (QR region)');
        return {
          found: true,
          url: qr.rawValue.startsWith('http') ? qr.rawValue : undefined,
          rawData: qr.rawValue,
          format: qr.format,
          confidence: 'native-qr-region',
        };
      }
    }
    
    // Step 3: Fallback to jsQR on enhanced QR region
    if (processed.qrRegion) {
      console.log('🔍 Trying jsQR on enhanced QR region...');
      const result = await scanImageDataWithJsQR(processed.qrRegion);
      if (result.found) {
        result.confidence = 'jsqr-qr-region';
        return result;
      }
    }
    
    // Step 4: Last resort - scan full enhanced image
    console.log('🔍 Trying jsQR on full enhanced image...');
    const result = await scanImageDataWithJsQR(processed.enhanced);
    if (result.found) {
      result.confidence = 'jsqr-full-enhanced';
      return result;
    }
    
    return { found: false };
  } catch (error) {
    console.error('QR scan failed:', error);
    return { found: false };
  }
}

/**
 * Convert ImageData to Blob for BarcodeDetector
 */
function imageDataToBlob(imageData: ImageData): Blob {
  const canvas = new OffscreenCanvas(imageData.width, imageData.height);
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(imageData, 0, 0);
  
  // Note: OffscreenCanvas doesn't have toBlob, use manual conversion
  const rgbaData = imageData.data;
  return new Blob([rgbaData], { type: 'image/raw' });
}

/**
 * Scan ImageData with jsQR
 */
async function scanImageDataWithJsQR(imageData: ImageData): Promise<QRScanResult> {
  try {
    const jsQR = (await import('jsqr')).default;
    
    // Try all inversion modes
    const modes = ['attemptBoth', 'dontInvert', 'onlyInvert'] as const;
    
    for (const mode of modes) {
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: mode,
      });
      
      if (code) {
        console.log(`✅ Found with jsQR (mode: ${mode})`);
        return {
          found: true,
          url: code.data.startsWith('http') ? code.data : undefined,
          rawData: code.data,
          format: 'qr_code',
        };
      }
    }
    
    return { found: false };
  } catch (error) {
    console.error('jsQR failed:', error);
    return { found: false };
  }
}

/**
 * Check if device supports native QR scanning
 */
export function supportsNativeQRScanning(): boolean {
  return 'BarcodeDetector' in window;
}
