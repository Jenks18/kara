import Tesseract from 'tesseract.js';

export interface FuelOCRResult {
  litres: number | null;
  fuelType: 'PETROL' | 'DIESEL' | 'SUPER' | 'GAS' | null;
  pricePerLitre: number | null;
  pumpNumber: string | null;
  vehicleNumber: string | null;
  confidence: number;
  source: string;
}

export async function extractWithTesseract(
  imageBuffer: Buffer,
  totalAmount: number
): Promise<FuelOCRResult> {
  try {
    // Convert buffer to base64
    const base64 = imageBuffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64}`;

    console.log('Running Tesseract OCR...');

    const {
      data: { text },
    } = await Tesseract.recognize(dataUrl, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`Tesseract: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    console.log('✓ Tesseract extracted text (first 200 chars):', text.substring(0, 200));

    // Parse the extracted text
    return parseReceiptText(text, totalAmount);
  } catch (error: any) {
    console.error('Tesseract failed:', error);
    return {
      litres: null,
      fuelType: null,
      pricePerLitre: null,
      pumpNumber: null,
      vehicleNumber: null,
      confidence: 0,
      source: 'tesseract_failed',
    };
  }
}

function parseReceiptText(text: string, totalAmount: number): FuelOCRResult {
  // Detect fuel type
  const fuelPatterns: Record<string, RegExp> = {
    PETROL: /\b(PETROL|PMS|SUPER)\b/i,
    DIESEL: /\b(DIESEL|AGO)\b/i,
    GAS: /\b(GAS|LPG)\b/i,
  };

  let fuelType: FuelOCRResult['fuelType'] = null;
  for (const [type, pattern] of Object.entries(fuelPatterns)) {
    if (pattern.test(text)) {
      fuelType = type as FuelOCRResult['fuelType'];
      break;
    }
  }

  // Find pump number
  const pumpMatch = text.match(/PUMP\s*[:#]?\s*(\d+)/i);
  const pumpNumber = pumpMatch ? pumpMatch[1] : null;

  // Find vehicle number (Kenyan format: ABC 123X)
  const vehicleMatch = text.match(/\b([A-Z]{3}\s*\d{3}[A-Z])\b/i);
  const vehicleNumber = vehicleMatch ? vehicleMatch[1].replace(/\s+/g, ' ') : null;

  // Find all numbers in text
  const numbers = Array.from(text.matchAll(/\d+\.?\d*/g)).map((m) =>
    parseFloat(m[0])
  );

  // Find litres by price validation
  const candidates = numbers
    .filter((n) => n >= 5 && n <= 100) // Reasonable tank size
    .map((litres) => {
      const pricePerLitre = totalAmount / litres;

      if (pricePerLitre >= 160 && pricePerLitre <= 250) {
        return {
          litres,
          pricePerLitre,
          confidence: calculateConfidence(pricePerLitre, fuelType),
        };
      }
      return null;
    })
    .filter(Boolean) as Array<{
    litres: number;
    pricePerLitre: number;
    confidence: number;
  }>;

  if (candidates.length > 0) {
    // Pick candidate with highest confidence
    const best = candidates.sort((a, b) => b.confidence - a.confidence)[0];

    return {
      litres: best.litres,
      pricePerLitre: best.pricePerLitre,
      fuelType,
      pumpNumber,
      vehicleNumber,
      confidence: best.confidence,
      source: 'tesseract_ocr',
    };
  }

  return {
    litres: null,
    fuelType,
    pricePerLitre: null,
    pumpNumber,
    vehicleNumber,
    confidence: 0,
    source: 'tesseract_ocr',
  };
}

function calculateConfidence(
  pricePerLitre: number,
  fuelType: string | null
): number {
  // Fuel-specific price ranges (Kenya 2025)
  const ranges: Record<string, [number, number]> = {
    PETROL: [170, 230],
    DIESEL: [160, 220],
    GAS: [100, 150],
  };

  if (fuelType && ranges[fuelType]) {
    const [min, max] = ranges[fuelType];
    if (pricePerLitre >= min && pricePerLitre <= max) {
      return 95; // High confidence
    }
  }

  // Generic fuel price range
  if (pricePerLitre >= 160 && pricePerLitre <= 250) {
    return 75; // Medium confidence
  }

  return 30; // Low confidence
}
