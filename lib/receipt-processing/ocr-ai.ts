import { GoogleGenerativeAI } from '@google/generative-ai';
import type { KRAInvoiceData } from './kra-scraper';

export interface GeminiReceiptData {
  merchantName: string | null;
  merchantAddress?: string | null;
  totalAmount: number | null;
  vatAmount?: number | null;
  invoiceDate: string | null;
  invoiceNumber: string | null;
  category: string | null;
  items?: Array<{
    description: string;
    quantity?: number;
    unitPrice?: number;
    totalPrice: number;
  }>;
  confidence: number;
  fieldConfidence?: {
    merchantName: number;
    totalAmount: number;
    invoiceDate: number;
  };
  hasEtimsQR?: boolean;
  etimsQRContent?: string;
}

// Deprecated: Use GeminiReceiptData instead
// Kept for backward compatibility only
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

  const prompt = `You are an expert receipt data extractor for Kenyan businesses. Analyze this receipt image and extract ALL relevant information.

🔍 IMPORTANT - SCAN FOR eTIMS QR CODE:
Kenya Revenue Authority (KRA) requires businesses to use eTIMS. Look for:
- QR codes (usually at top or bottom of receipt)
- Text like "eTIMS", "iTax", "KRA", or "Scan to verify"
- URLs starting with "https://itax.kra.go.ke" or "https://etims.kra.go.ke"
If you see a QR code, set hasEtimsQR=true

⚠️ READING ORDER:
1. START AT THE TOP - Business name and address
2. SCAN for QR codes (any position on receipt)
3. Read HEADER: Store name, address, KRA PIN, contacts
4. Read BODY: Transaction details, items, quantities
5. Read FOOTER: Subtotal, VAT, Total, payment method

Return ONLY this JSON (no markdown, no explanation, no code fences):
{
  "merchantName": "<business name from TOP of receipt>",
  "merchantAddress": "<full address from header if visible>",
  "totalAmount": <final total in KES as number>,
  "vatAmount": <VAT/tax amount or null>,
  "invoiceDate": "YYYY-MM-DD",
  "invoiceNumber": "<receipt/invoice/TRX number>",
  "category": "<one of: Food, Transport, Shopping, Fuel, Entertainment, Utilities, Health, Other>",
  "items": [
    {"description": "<item name>", "quantity": <number or null>, "unitPrice": <number or null>, "totalPrice": <number>}
  ],
  "hasEtimsQR": <true if QR code present, false otherwise>,
  "etimsQRContent": "<visible text near QR if any, or null>",
  "confidence": <0-100 overall>,
  "fieldConfidence": {
    "merchantName": <0-100>,
    "totalAmount": <0-100>,
    "invoiceDate": <0-100>
  }
}

KENYAN RECEIPT PATTERNS (treat all equally):

1. FOOD & RESTAURANTS:
   - Supermarkets: Naivas, Carrefour, Quickmart, Chandarana
   - Restaurants: Java House, Artcaffe, KFC, Galitos, Steers
   - Fast food: Pizza Inn, Domino's, Big Square
   - Cafes: Dormans, Artcaffe, Urban Burger
   
2. RETAIL & SHOPPING:
   - Clothing: Bata, Woolworths, Mr Price, Zara
   - Electronics: Safaricom shops, Masoko, Jumia
   - General: Game, Nakumatt (if still around), Tuskys
   
3. TRANSPORT:
   - Ride-hail: Uber, Bolt, Little Cab
   - Public: SGR, Matatu SACCO receipts, bus tickets
   - Fuel: Shell, Total Energies, Rubis, Vivo, Hass
   
4. SERVICES:
   - Utilities: KPLC, Nairobi Water, internet/TV providers
   - Communication: Safaricom, Airtel, Telkom airtime
   - Health: Hospital/clinic receipts, pharmacy
   - Professional: Barber, salon, dry cleaning
   
5. MOBILE MONEY:
   - M-PESA: Transaction messages, agent receipts
   - Banking: KCB, Equity, Co-op Bank ATM slips
   
6. GENERAL KENYAN RECEIPT STRUCTURE:
   ┌─────────────────────────────┐
   │   STORE NAME (Largest)      │ ← START HERE!
   │   Store Address Line 1      │
   │   Store Address Line 2      │
   │   Tel: +254... KRA PIN: P..│
   ├─────────────────────────────┤
   │   TAX INVOICE / RECEIPT     │
   │   Date: DD/MM/YYYY Time:... │
   │   Receipt #: ABC123         │
   ├─────────────────────────────┤
   │   Items/Services            │
   │   ...                       │
   ├─────────────────────────────┤
   │   Subtotal:     1,234.00    │
   │   VAT 16%:        197.44    │
   │   TOTAL:        1,431.44    │
   └─────────────────────────────┘

7. KRA PIN FORMAT: A/P + 9 digits + letter (e.g., P051234567A, A001234567B)
8. DATE FORMATS: 
   - DD/MM/YYYY (most common in Kenya)
   - DD-MMM-YY (e.g., 15-FEB-26)
   - YYYY-MM-DD (ISO format, less common)
9. CURRENCY: KES, KSH, Ksh, /= (shillings symbol)
10. PHONE: +254..., 07..., 01... (Kenyan formats)

CATEGORY CLASSIFICATION (choose the BEST fit):
- Food: Supermarkets, restaurants, cafes, groceries, meals
- Transport: Uber, Bolt, matatu, fuel, parking, SGR, flights
- Shopping: Clothing, electronics, household items, gifts
- Fuel: Specifically fuel/petrol stations (Shell, Total, etc.)
- Entertainment: Movies, concerts, games, sports events
- Utilities: Electricity, water, internet, phone, TV subscription
- Health: Hospitals, clinics, pharmacies, medical supplies
- Other: Anything that doesn't fit above categories

CATEGORY DECISION TREE:
1. If merchant is fuel station → "Fuel"
2. If merchant is restaurant/supermarket/food → "Food"
3. If receipt shows transport service → "Transport"
4. If items are clothes/electronics/goods → "Shopping"
5. If service is utilities/bills → "Utilities"
6. If medical/pharmacy → "Health"
7. If entertainment venue → "Entertainment"
8. Otherwise → "Other"

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
    const validCategories = ['Food', 'Transport', 'Shopping', 'Fuel', 'Entertainment', 'Utilities', 'Health', 'Other'];
    if (!extracted.category || !validCategories.includes(extracted.category)) {
      extracted.category = 'Other';
    }

    return extracted;
  } catch (error: any) {
    console.error('Gemini OCR failed:', error);
    throw error;
  }
}
