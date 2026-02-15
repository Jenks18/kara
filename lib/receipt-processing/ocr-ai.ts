import { GoogleGenerativeAI } from '@google/generative-ai';
import type { KRAInvoiceData } from './kra-scraper';

export interface GeminiReceiptData {
  merchantName: string | null;
  totalAmount: number | null;
  invoiceDate: string | null;
  invoiceNumber: string | null;
  litres: number | null;
  fuelType: 'PETROL' | 'DIESEL' | 'SUPER' | 'GAS' | null;
  pricePerLitre: number | null;
  category: string | null;
  confidence: number;
  fieldConfidence?: {
    merchantName: number;
    totalAmount: number;
    invoiceDate: number;
  };
}

export interface GeminiFuelResult {
  litres: number | null;
  fuelType: 'PETROL' | 'DIESEL' | 'SUPER' | 'GAS' | null;
  pricePerLitre: number | null;
  pumpNumber: string | null;
  vehicleNumber: string | null;
  confidence: number;
  source: string;
}

export async function extractWithGemini(
  imageBuffer: Buffer,
  kraData: KRAInvoiceData
): Promise<GeminiFuelResult> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const imageBase64 = imageBuffer.toString('base64');

  const prompt = `You are analyzing a Kenyan fuel receipt.

We ALREADY VERIFIED with KRA iTax system:
- Merchant: ${kraData.merchantName}
- Total Amount: ${kraData.totalAmount} KES
- Date: ${kraData.invoiceDate}
- Invoice: ${kraData.invoiceNumber}

Your job: Extract ONLY the fuel-specific data from the receipt IMAGE.

Return ONLY this JSON (no markdown, no explanation):
{
  "litres": <number or null>,
  "fuelType": "PETROL" | "DIESEL" | "SUPER" | "GAS" | null,
  "pricePerLitre": <number or null>,
  "pumpNumber": <string or null>,
  "vehicleNumber": <string or null>,
  "confidence": <0-100>
}

IMPORTANT:
1. Look for volume near: LITRES, L, Ltrs, QTY, VOLUME, DISPENSED
2. Common formats: "37.62 L", "25.5 Ltrs", "Vol: 30.0"
3. Fuel codes: PMS=Petrol, AGO=Diesel, DPK=Kerosene
4. VALIDATE: ${kraData.totalAmount} ÷ litres should be 160-250 KES/L
5. Vehicle format: ABC 123X (Kenyan plates)
6. If unclear, return null with low confidence`;

  try {
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBase64,
        },
      },
    ]);

    const responseText = result.response.text();

    // Parse JSON from response (handle markdown code blocks)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Gemini did not return valid JSON');
    }

    const extracted: GeminiFuelResult = JSON.parse(jsonMatch[0]);

    // Validate price calculation
    if (extracted.litres && extracted.litres > 0) {
      const calculatedPrice = kraData.totalAmount / extracted.litres;

      if (calculatedPrice < 160 || calculatedPrice > 250) {
        console.warn(
          `⚠️ Unusual price: ${calculatedPrice.toFixed(2)} KES/L - reducing confidence`
        );
        extracted.confidence = Math.max(0, extracted.confidence - 30);
      } else {
        // Use calculated price if Gemini didn't provide one
        extracted.pricePerLitre = extracted.pricePerLitre || calculatedPrice;
      }
    }

    extracted.source = 'gemini_vision';

    return extracted;
  } catch (error: any) {
    console.error('Gemini processing failed:', error);
    throw error;
  }
}

/**
 * Extract receipt data using Gemini Vision (fallback when QR/KRA fails).
 * Enhanced for Kenyan receipts: handles fuel, supermarket, restaurant, M-Pesa, etc.
 */
export async function extractReceiptWithGemini(
  imageBuffer: Buffer
): Promise<GeminiReceiptData> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const imageBase64 = imageBuffer.toString('base64');

  const prompt = `You are an expert Kenyan receipt data extractor. Analyze this receipt image carefully.

Return ONLY this JSON (no markdown, no explanation, no code fences):
{
  "merchantName": "<business name exactly as printed>",
  "totalAmount": <final total in KES as a number>,
  "invoiceDate": "YYYY-MM-DD",
  "invoiceNumber": "<receipt/invoice/TRX number>",
  "litres": <fuel volume number or null>,
  "fuelType": "PETROL" | "DIESEL" | "SUPER" | "GAS" | null,
  "pricePerLitre": <number or null>,
  "category": "<one of: Fuel, Food, Transport, Accommodation, Office Supplies, Communication, Maintenance, Other>",
  "confidence": <0-100 overall>,
  "fieldConfidence": {
    "merchantName": <0-100>,
    "totalAmount": <0-100>,
    "invoiceDate": <0-100>
  }
}

KENYAN RECEIPT PATTERNS:
1. FUEL: Shell, TotalEnergies, Rubis, Vivo, National Oil, Gulf, Hass — look for LITRES, PMS, AGO, DPK, DAK
2. SUPERMARKET: Naivas, Carrefour, Quickmart, Chandarana, Tuskys — look for item lines
3. M-PESA: Safaricom receipts — look for Transaction ID, MPESA
4. RESTAURANTS: Java House, Artcaffe, KFC — look for Table, Covers, VAT
5. TRANSPORT: Uber, Bolt, SGR — look for Trip, Ride
6. Look for KRA PIN format: A/P + 9 digits + letter (e.g., P051234567A)
7. Date formats: DD/MM/YYYY (most common in Kenya), DD-MMM-YY, YYYY-MM-DD
8. Currency: KES, KSH, Ksh, /= often follows amounts

CATEGORY RULES:
- Has litres/fuel type → "Fuel"
- Branded food/restaurant/café → "Food"
- Uber/Bolt/SGR/taxi → "Transport"
- Hotel/lodge/airbnb → "Accommodation"
- Safaricom/Airtel/Telkom → "Communication"
- Stationery/printer/paper → "Office Supplies"
- Car service/repair/parts → "Maintenance"
- Everything else → "Other"

FIELD CONFIDENCE: Rate each field 0-100 independently. If text is blurry or partially cut off, lower confidence.`;

  try {
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBase64,
        },
      },
    ]);

    const responseText = result.response.text();

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Gemini did not return valid JSON');
    }

    const extracted: GeminiReceiptData = JSON.parse(jsonMatch[0]);

    // Ensure category is one of the valid options
    const validCategories = ['Fuel', 'Food', 'Transport', 'Accommodation', 'Office Supplies', 'Communication', 'Maintenance', 'Other'];
    if (!extracted.category || !validCategories.includes(extracted.category)) {
      extracted.category = extracted.litres ? 'Fuel' : 'Other';
    }

    return extracted;
  } catch (error: any) {
    console.error('Gemini OCR failed:', error);
    throw error;
  }
}
