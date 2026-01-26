import { GoogleGenerativeAI } from '@google/generative-ai';
import type { KRAInvoiceData } from './kra-scraper';

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
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

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
    console.log('Gemini response:', responseText.substring(0, 200));

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
