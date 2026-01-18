import Tesseract from 'tesseract.js';

export interface ReceiptOCRResult {
  // Financial data (from receipt image)
  totalAmount: number | null;
  subtotal: number | null;
  vatAmount: number | null;
  
  // Fuel-specific data
  litres: number | null;
  fuelType: 'PETROL' | 'DIESEL' | 'SUPER' | 'GAS' | null;
  pricePerLitre: number | null;
  
  // Station/transaction data
  merchantName: string | null;
  location: string | null;
  pumpNumber: string | null;
  attendantName: string | null;
  vehicleNumber: string | null;
  transactionDate: string | null;
  transactionTime: string | null;
  
  // Metadata
  confidence: number;
  source: string;
  rawText: string; // Full extracted text for debugging
}

export async function extractWithTesseract(
  imageBuffer: Buffer
): Promise<ReceiptOCRResult> {
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
    return parseReceiptText(text);
  } catch (error: any) {
    console.error('Tesseract failed:', error);
    return {
      totalAmount: null,
      subtotal: null,
      vatAmount: null,
      litres: null,
      fuelType: null,
      pricePerLitre: null,
      merchantName: null,
      location: null,
      pumpNumber: null,
      attendantName: null,
      vehicleNumber: null,
      transactionDate: null,
      transactionTime: null,
      confidence: 0,
      source: 'tesseract_failed',
      rawText: '',
    };
  }
}

function parseReceiptText(text: string): ReceiptOCRResult {
  const textUpper = text.toUpperCase();
  
  // Extract merchant name (usually at top)
  const merchantPatterns = [
    /^([A-Z\s&]+(?:PETROL|DIESEL|ENERGY|OIL|FUEL|STATION))/m,
    /^([A-Z\s&]{3,40})/m, // First line, 3-40 chars
  ];
  
  let merchantName: string | null = null;
  for (const pattern of merchantPatterns) {
    const match = text.match(pattern);
    if (match) {
      merchantName = match[1].trim();
      break;
    }
  }
  
  // Extract location
  const locationMatch = text.match(/(?:BRANCH|LOCATION|STATION)[:\s]*([A-Z\s,]+)/i);
  const location = locationMatch ? locationMatch[1].trim() : null;
  
  // Extract date
  const datePatterns = [
    /(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/,
    /(\d{4}[-/]\d{1,2}[-/]\d{1,2})/,
  ];
  let transactionDate: string | null = null;
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      transactionDate = match[1];
      break;
    }
  }
  
  // Extract time
  const timeMatch = text.match(/(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)/i);
  const transactionTime = timeMatch ? timeMatch[1] : null;
  
  // Extract amounts
  const amountPattern = /(?:TOTAL|AMOUNT|GROSS)[:\s]*(?:KES|KSH)?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i;
  const totalMatch = text.match(amountPattern);
  const totalAmount = totalMatch ? parseFloat(totalMatch[1].replace(/,/g, '')) : null;
  
  const vatPattern = /(?:VAT|TAX)[:\s]*(?:KES|KSH)?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i;
  const vatMatch = text.match(vatPattern);
  const vatAmount = vatMatch ? parseFloat(vatMatch[1].replace(/,/g, '')) : null;
  
  const subtotalPattern = /(?:SUBTOTAL|SUB-TOTAL)[:\s]*(?:KES|KSH)?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i;
  const subtotalMatch = text.match(subtotalPattern);
  const subtotal = subtotalMatch ? parseFloat(subtotalMatch[1].replace(/,/g, '')) : null;

  // Detect fuel type
  const fuelPatterns: Record<string, RegExp> = {
    PETROL: /\b(PETROL|PMS|SUPER)\b/i,
    DIESEL: /\b(DIESEL|AGO)\b/i,
    GAS: /\b(GAS|LPG)\b/i,
  };

  let fuelType: ReceiptOCRResult['fuelType'] = null;
  for (const [type, pattern] of Object.entries(fuelPatterns)) {
    if (pattern.test(text)) {
      fuelType = type as ReceiptOCRResult['fuelType'];
      break;
    }
  }

  // Find pump number
  const pumpMatch = text.match(/PUMP\s*[:#]?\s*(\d+)/i);
  const pumpNumber = pumpMatch ? pumpMatch[1] : null;
  
  // Find attendant
  const attendantMatch = text.match(/(?:ATTENDANT|SERVED BY|CASHIER)[:\s]*([A-Z\s]+)/i);
  const attendantName = attendantMatch ? attendantMatch[1].trim() : null;

  // Find vehicle number (Kenyan format: ABC 123X)
  const vehicleMatch = text.match(/\b([A-Z]{3}\s*\d{3}[A-Z])\b/i);
  const vehicleNumber = vehicleMatch ? vehicleMatch[1].replace(/\s+/g, ' ') : null;

  // Extract litres (look for volume-related keywords)
  const litresPatterns = [
    /(?:LITRES?|LTRS?|L|VOL|VOLUME|QTY|QUANTITY)[:\s]*(\d+\.?\d*)/i,
    /(\d+\.?\d*)\s*(?:LITRES?|LTRS?|L)/i,
  ];
  
  let litres: number | null = null;
  for (const pattern of litresPatterns) {
    const match = text.match(pattern);
    if (match) {
      const value = parseFloat(match[1]);
      if (value >= 1 && value <= 200) { // Reasonable fuel range
        litres = value;
        break;
      }
    }
  }
  
  // Calculate price per litre if we have both values
  let pricePerLitre: number | null = null;
  if (litres && totalAmount) {
    pricePerLitre = totalAmount / litres;
  }
  
  // Calculate confidence based on what we extracted
  let confidence = 0;
  if (merchantName) confidence += 15;
  if (totalAmount) confidence += 25;
  if (litres) confidence += 30;
  if (fuelType) confidence += 15;
  if (pricePerLitre && pricePerLitre >= 160 && pricePerLitre <= 250) confidence += 15;

  return {
    totalAmount,
    subtotal,
    vatAmount,
    litres,
    fuelType,
    pricePerLitre,
    merchantName,
    location,
    pumpNumber,
    attendantName,
    vehicleNumber,
    transactionDate,
    transactionTime,
    confidence,
    source: 'tesseract_ocr',
    rawText: text,
  };
}
