# Kara Receipt Processing - Backend API Documentation

## Architecture: Store & Forward Model

The receipt processing happens **asynchronously** on the server after the user captures and uploads the image. This allows for heavy OCR/ML processing without slowing down the mobile app.

---

## API Endpoints

### 1. Upload Receipt

**POST** `/api/receipts/upload`

Uploads the receipt image and queues it for processing.

**Request:**
```json
{
  "image": "base64_encoded_image_data",
  "userId": "user_123",
  "capturedAt": "2025-12-29T13:26:00Z"
}
```

**Response:**
```json
{
  "receiptId": "rcpt_abc123",
  "status": "uploading",
  "imageUrl": "https://cdn.kara.app/receipts/rcpt_abc123.jpg",
  "estimatedProcessingTime": 120
}
```

---

### 2. Get Receipt Status

**GET** `/api/receipts/{receiptId}/status`

Check the current processing status of a receipt.

**Response:**
```json
{
  "receiptId": "rcpt_abc123",
  "status": "processing",
  "progress": 65,
  "currentStep": "extracting_fuel_data",
  "steps": [
    { "name": "qr_decode", "status": "complete", "confidence": 100 },
    { "name": "ocr_extraction", "status": "in_progress", "confidence": null },
    { "name": "validation", "status": "pending", "confidence": null }
  ]
}
```

---

### 3. Complete Review

**POST** `/api/receipts/{receiptId}/review`

User submits missing information for manual review.

**Request:**
```json
{
  "litres": 25.5,
  "fuelType": "DIESEL",
  "vehicleNumber": "KBX 123A",
  "odometer": 45000
}
```

**Response:**
```json
{
  "receiptId": "rcpt_abc123",
  "status": "verified",
  "transaction": {
    "id": "txn_xyz789",
    "merchant": "Mascot Petroleum",
    "amount": 5700.00,
    "litres": 25.5,
    "pricePerLitre": 223.53,
    "fuelType": "DIESEL"
  }
}
```

---

## Processing Workflow (Server-Side)

### Step 1: QR Code Extraction

**Goal:** Extract KRA fiscal URL and scrape invoice data (high confidence)

#### **Recommended QR Libraries:**

**For Browser/Web (Best for our use case):**
```bash
npm install html5-qrcode
# OR
npm install jsqr
```

**For Node.js Backend:**
```bash
npm install @zxing/library  # TypeScript, actively maintained
# OR
npm install qrcode-reader  # Simpler, works with Canvas
```

**For Python (if using Python backend):**
```bash
pip install opencv-python qrcode[pil]  # Faster than pyzbar
# OR
pip install pyzbar  # Original, but older
```

#### **Better Implementation:**

```typescript
// Option 1: Browser-based with html5-qrcode (RECOMMENDED for web app)
import { Html5Qrcode } from 'html5-qrcode';

async function scanQRFromImage(imageFile: File): Promise<string> {
  const html5QrCode = new Html5Qrcode("reader");
  
  try {
    const qrCodeMessage = await html5QrCode.scanFile(imageFile, false);
    return qrCodeMessage; // Returns the URL directly
  } catch (err) {
    throw new Error('No QR code found');
  }
}

// Option 2: Node.js Backend with ZXing
import { BrowserMultiFormatReader } from '@zxing/library';

async function decodeQR(imagePath: string): Promise<string> {
  const codeReader = new BrowserMultiFormatReader();
  const result = await codeReader.decodeFromImageUrl(imagePath);
  return result.getText(); // KRA URL
}
```

---

### Step 2: Scrape KRA Website (Get Basic Invoice Data)

**IMPORTANT:** The QR code URL contains basic invoice verification on KRA's website. This is a **server-rendered JSP page** (no JavaScript needed).

**Sample URL from real receipt:**
```
https://itax.kra.go.ke/KRA-Portal/invoiceChk.htm?actionCode=loadPage&invoiceNo=0431598170000030659
```

**What KRA Actually Provides:**
```
✅ Control Unit Invoice Number
✅ Trader System Invoice No
✅ Invoice Date
✅ Supplier Name
✅ Total Invoice Amount
✅ Total Taxable Amount
✅ Total Tax Amount (VAT)

❌ NO fuel-specific data (litres, fuel type, etc.)
```

#### **Simple HTTP Scraping (No Browser Needed!)**

```typescript
import axios from 'axios';
import * as cheerio from 'cheerio';

interface KRAInvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  merchantName: string;
  totalAmount: number;
  taxableAmount: number;
  vatAmount: number;
  traderInvoiceNo: string;
  confidence: 100;
  source: 'kra_website';
}

async function scrapeKRAInvoice(qrUrl: string): Promise<KRAInvoiceData> {
  // Add realistic headers to avoid blocking
  const response = await axios.get(qrUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    timeout: 15000,
  });
  
  const $ = cheerio.load(response.data);
  
  // KRA uses a simple table with label-value pairs
  const data: Record<string, string> = {};
  
  $('tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length >= 2) {
      // Extract label and value pairs
      for (let i = 0; i < cells.length - 1; i += 2) {
        const label = $(cells[i]).text().trim();
        const value = $(cells[i + 1]).text().trim();
        if (label && value) {
          data[label] = value;
        }
      }
    }
  });
  
  // Parse the extracted data
  return {
    invoiceNumber: data['Control Unit Invoice Number'] || '',
    traderInvoiceNo: data['Trader System Invoice No'] || '',
    invoiceDate: data['Invoice Date'] || '',
    merchantName: data['Supplier Name'] || '',
    totalAmount: parseFloat(data['Total Invoice Amount']?.replace(/[^\d.]/g, '') || '0'),
    taxableAmount: parseFloat(data['Total Taxable Amount']?.replace(/[^\d.]/g, '') || '0'),
    vatAmount: parseFloat(data['Total Tax Amount']?.replace(/[^\d.]/g, '') || '0'),
    confidence: 100,
    source: 'kra_website',
  };
}
```

**Error Handling & Rate Limiting:**
```typescript
async function scrapeKRAWithRetry(qrUrl: string, maxRetries = 3): Promise<KRAInvoiceData | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Add delay to respect KRA servers
      if (attempt > 1) {
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
      
      const data = await scrapeKRAInvoice(qrUrl);
      
      // Validate we got real data
      if (!data.invoiceNumber || !data.merchantName) {
        throw new Error('Incomplete data from KRA');
      }
      
      return data;
    } catch (error) {
      console.error(`KRA scrape attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        // Log for monitoring
        console.error('KRA scraping failed after all retries');
        return null;
      }
    }
  }
  return null;
}
```

**Important Notes:**
- ⚠️ **KRA is a government system** - respect rate limits
- ⚠️ **Don't batch scrape** - only verify when user uploads receipt
- ⚠️ **Cache results** - don't re-scrape the same invoice
- ⚠️ **Use residential IPs** if possible (cloud IPs may be blocked)
- ⚠️ **Monitor for CAPTCHA** - may be added in future

**Why Simple HTTP Works:**
- ✅ KRA page is server-rendered (no React/Vue)
- ✅ Data is in HTML on page load
- ✅ No JavaScript execution needed
- ✅ Faster than Puppeteer (100ms vs 3s)
- ✅ Lower memory usage

---

### Step 3: OCR Text Extraction (ALWAYS Required for Fuel Data!)

**Goal:** Extract fuel-specific data from receipt image (KRA doesn't have this!)

**What We Need from OCR:**
- ✅ **Litres/Volume** (e.g., "25.5 L", "37.62 Ltrs")
- ✅ **Fuel Type** (PETROL, DIESEL, SUPER, GAS)
- ✅ **Price Per Litre** (if visible)
- ✅ **Vehicle/Pump Number** (optional)
- ✅ **Odometer Reading** (if present)

**What We Already Have from KRA:**
- ✅ Merchant name
- ✅ Total amount
- ✅ Date/time
- ✅ Invoice number
- ✅ VAT breakdown

#### **OCR Options Comparison:**

| Option | Cost | Accuracy | Speed | Best For |
|--------|------|----------|-------|----------|
| **Tesseract** | FREE | 70-80% | Fast | Budget, simple receipts |
| **Google Vision** | $1.50/1000 | 95%+ | Fast | Production, best accuracy |
| **Gemini Vision** | $0.01/image | 90%+ | Medium | **RECOMMENDED** - Cheap + Smart |
| **GPT-4 Vision** | $0.01/image | 92%+ | Slow | Complex receipts |
| **Groq Vision** | N/A | - | - | No vision API yet |
| **AWS Textract** | $1.50/1000 | 93% | Fast | AWS ecosystem |

#### **Option 1: FREE - Tesseract OCR**

```typescript
// Node.js with Tesseract
import Tesseract from 'tesseract.js';

async function extractTextFree(imagePath: string) {
  const { data: { text } } = await Tesseract.recognize(
    imagePath,
    'eng',
    {
      logger: m => console.log(m) // Progress updates
    }
  );
  
  return text;
}
```

**Pros:**
- ✅ Completely FREE
- ✅ Works offline
- ✅ No API keys needed

**Cons:**
- ❌ Lower accuracy (70-80%)
- ❌ Struggles with handwritten text
- ❌ Needs pre-processing for best results

---

#### **Option 2: RECOMMENDED - Gemini Vision API**

**Why Gemini is Better:**
- ✅ **Understands context** (knows what fuel receipts look like)
- ✅ **Cheapest paid option** ($0.01 per image = 100 images for $1)
- ✅ **Smart extraction** (can find litres even in messy receipts)
- ✅ **Structured output** (returns JSON directly)

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';

interface FuelOCRResult {
  litres: number | null;
  fuelType: 'PETROL' | 'DIESEL' | 'SUPER' | 'GAS' | null;
  pricePerLitre: number | null;
  pumpNumber?: string;
  vehicleNumber?: string;
  odometer?: number;
  confidence: number;
}

async function extractFuelDataWithGemini(
  imagePath: string, 
  kraData: KRAInvoiceData
): Promise<FuelOCRResult> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  // Read image as base64
  const imageBuffer = await fs.readFile(imagePath);
  const imageBase64 = imageBuffer.toString('base64');
  
  const prompt = `You are analyzing a Kenyan fuel receipt from ${kraData.merchantName}.

We ALREADY KNOW (from KRA database):
- Merchant: ${kraData.merchantName}
- Total Amount: ${kraData.totalAmount} KES
- Date: ${kraData.invoiceDate}
- Invoice: ${kraData.invoiceNumber}

What we NEED from the receipt image:
- Fuel volume in litres
- Fuel type (PETROL/PMS, DIESEL/AGO, SUPER, GAS/LPG)
- Price per litre (if shown)
- Pump/Vehicle/Odometer (if visible)

Return ONLY this JSON (no markdown, no explanation):
{
  "litres": <number or null>,
  "fuelType": "PETROL" | "DIESEL" | "SUPER" | "GAS" | null,
  "pricePerLitre": <number or null>,
  "pumpNumber": <string or null>,
  "vehicleNumber": <string or null>,
  "odometer": <number or null>,
  "confidence": <0-100>
}

VALIDATION:
- If you find litres, verify: ${kraData.totalAmount} ÷ litres = 160-250 KES/L (typical Kenya fuel prices)
- Common formats: "37.62 L", "25.5 Ltrs", "Vol: 30.0"
- Fuel codes: PMS=Petrol, AGO=Diesel, DPK=Kerosene
- Be careful with handwritten numbers
- Look near "LITRES", "QTY", "VOLUME", "DISPENSED"`;

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        mimeType: 'image/jpeg',
        data: imageBase64
      }
    }
  ]);
  
  const responseText = result.response.text();
  
  // Parse JSON from response (handle markdown code blocks)
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Gemini did not return valid JSON');
  }
  
  const extracted: FuelOCRResult = JSON.parse(jsonMatch[0]);
  
  // Double-check price validation
  if (extracted.litres && extracted.litres > 0) {
    const calculatedPrice = kraData.totalAmount / extracted.litres;
    
    if (calculatedPrice < 160 || calculatedPrice > 250) {
      console.warn(`⚠ Price validation failed: ${calculatedPrice.toFixed(2)} KES/L is unusual`);
      extracted.confidence = Math.max(0, extracted.confidence - 30);
    } else {
      // Update price if not provided by Gemini
      extracted.pricePerLitre = extracted.pricePerLitre || calculatedPrice;
    }
  }
  
  return extracted;
}
```

**Pricing:**
- First 50 images/day: FREE
- After that: $0.00025 per image (1000 images = $0.25!)
- Way cheaper than Google Vision ($1.50/1000)

---

#### **Option 3: GPT-4 Vision (If Gemini fails)**

```typescript
import OpenAI from 'openai';

async function extractWithGPT4Vision(imagePath: string, totalAmount: number) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  const imageBuffer = await fs.readFile(imagePath);
  const imageBase64 = imageBuffer.toString('base64');
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o",  // Has vision
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Extract fuel data from this receipt. Total: ${totalAmount} KES. Return JSON with litres, fuelType, pricePerLitre, confidence.`
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`
            }Smart Waterfall Approach (BEST!)**

```typescript
async function extractFuelData(imagePath: string, kraData: KRAInvoiceData) {
  // KRA doesn't have fuel-specific data, so we ALWAYS need OCR
  // But we can try free options first before paid AI
  
  // Strategy 1: Try Tesseract (FREE) for clear printed receipts
  try {
    const text = await extractTextFree(imagePath);
    const parsed = parseReceiptText(text, kraData.totalAmount);
    
    if (parsed.confidence > 80) {
      console.log('✓ Tesseract succeeded');
      return {
        ...parsed,
        source: 'tesseract_ocr'
      };
    }
    
    console.log('⚠ Tesseract low confidence, trying AI...');
  } catch (err) {
    console.log('✗ Tesseract failed:', err);
  }
  
  // Strategy 2: Use Gemini Vision (SMART + CHEAP)
  try {
    const geminiResult = await extractFuelDataWithGemini(imagePath, kraData);
    
    if (geminiResult.confidence > 70) {
      console.log('✓ Gemini succeeded');
      return {
        ...geminiResult,
        source: 'gemini_vision'
      };
    }
  } catch (err) {
    console.error('✗ Gemini failed:', err);
  }
  
  // Strategy 3: If all fails, return what we know + flag for review
  return {
    litres: null,
    fuelType: null,
    pricePerLitre: null,
    confidence: 0,
    source: 'needs_manual_review',
    kraData: kraData // Include KRA data so user sees merchant/amount
  }
  // If not in KRA data, try Tesseract first (free)
  try {
    const text = await extractTextFree(imagePath);
    const parsed = parseReceiptText(text, kraData.totalAmount);
    
    if (parsed.confidence > 80) {
      return parsed; // Good enough!
    }
  } catch (err) {
    console.log('Tesseract failed, trying Gemini...');
  }
  
  // Fallback to Gemini (paid but smart)
  return await extractFuelDataWithGemini(imagePath, kraData.totalAmount);
}
```

**Simple Text Parsing (for Tesseract output):**

```typescript
function parseReceiptText(text: string, totalAmount: number) {
  // Find fuel type keywords
  const fuelTypes = {
    'PETROL': /\b(PETROL|PMS|SUPER)\b/i,
    'DIESEL': /\b(DIESEL|AGO)\b/i,
    'GAS': /\b(GAS|LPG)\b/i,
    'KEROSENE': /\b(KEROSENE|ILO)\b/i
  };
  
  let detectedFuelType = null;
  for (const [type, pattern] of Object.entries(fuelTypes)) {
    if (pattern.test(text)) {
      detectedFuelType = type;
      break;
    }
  }
  
  // Find all numbers that could be litres
  const numbers = text.match(/\d+\.?\d*/g)?.map(n => parseFloat(n)) || [];
  
  const litresCandidates = numbers
    .filter(n => n >= 1 && n <= 100) // Reasonable tank size
    .map(litres => {
      const pricePerLitre = totalAmount / litres;
      
      // Validate against real-world prices
      if (pricePerLitre >= 160 && pricePerLitre <= 250) {
        return {
          litres,
          pricePerLitre,
          confidence: calculateConfidence(pricePerLitre, detectedFuelType)
        };
      }
      return null;
    })
    .filter(Boolean);
  
  if (litresCandidates.length > 0) {
    const best = litresCandidates.sort((a, b) => b!.confidence - a!.confidence)[0]!;
    return {
      litres: best.litres,
      pricePerLitre: best.pricePerLitre,
      fuelType: detectedFuelType,
      confidence: best.confidence
    };
  }
  
  return {
    litres: null,
    fuelType: detectedFuelType,
    confidence: 0
  };
}

function calculateConfidence(pricePerLitre: number, fuelType: string | null): number {
  // Tighter validation for specific fuel types
  const priceRanges: Record<string, [number, number]> = {
    'PETROL': [170, 230],
    'DIESEL': [160, 220],
    'GAS': [100, 150]
  };
  
  if (fuelType && priceRanges[fuelType]) {
    const [min, max] = priceRanges[fuelType];
    if (pricePerLitre >= min && pricePerLitre <= max) {
      return 95; // High confidence
    }
  }
  
  // Generic fuel price range
  if (pricePerLitre >= 160 && pricePerLitre <= 250) {
    return 75; // Medium confidence
  }
  
  return 20; // Low confidence
}
```

---

### Step 4: Data Validation & Merging

**Goal:** Create complete transaction from KRA + OCR data

```typescript
function createTransaction(kraData: any, ocrData: any) {
  const transaction = {
    // From KRA Website (100% confidence)
    merchant: kraData.merchantName,
    merchantPIN: kraData.merchantPIN,
    date: kraData.dateTime,
   Complete Processing Flow

```
1. USER CAPTURES RECEIPT IMAGE
   ↓
2. UPLOAD TO SERVER
   POST /api/receipts/upload
   ├─ Save image to cloud storage
   ├─ Generate receiptId
   └─ Queue for processing
   ↓
3. DECODE QR CODE
   ├─ html5-qrcode (browser) or @zxing/library (Node.js)
   └─ Extract: KRA URL
   └─ Example: https://itax.kra.go.ke/.../invoiceNo=0431598170000030659
   ↓
4. SCRAPE KRA WEBSITE ⭐
   ├─ Simple HTTP request (no browser needed!)
   ├─ Parse HTML table with Cheerio
   └─ Extract from KRA:
       ✓ Invoice Number: 0431598170000030659
       ✓ Merchant: DANKA AFRICA (K) LIMITED
       ✓ Date: 22/12/2025
       ✓ Total: 1000 KES
       ✓ VAT: 137 KES
   ↓
5. OCR RECEIPT IMAGE (ALWAYS - for fuel data!) ⭐
   ├─ Try Tesseract first (FREE)
   │   └─ If confidence > 80% → Use it
   ├─ If Tesseract fails → Gemini Vision ($0.01)
   │   └─ Smart extraction with context
   └─ Extract from OCR:
       ✓ Litres: 37.62 L
       ✓ Fuel Type: DIESEL
       ✓ Price/L: 223.53 KES (calculated)
       ✓ Pump: 4
       ✓ Vehicle: KBX 123A (if present)
   ↓
6. MERGE & VALIDATE
   ├─ Combine KRA data (100% confident)
   ├─ + OCR fuel data (70-95% confident)
   ├─ Validate: total ÷ litres = 160-250 KES/L
   └─ Calculate overall confidence
   ↓
7. SAVE TRANSACTION
   ├─ If confidence > 80% → Auto-approve ✓
   └─ If confidence < 80% → Flag for review ⚠️
   ↓
8. NOTIFY USER
   ├─ Push notification: "Receipt verified"
   └─ Or: "Need to confirm litres"
```

**Key Difference from V1:**
- ✅ KRA only provides basic invoice data (merchant, total, date)
- ✅ OCR is ALWAYS needed for fuel-specific data (litres, type)
- ✅ Use simple HTTP scraping (not Puppeteer)
- ✅ Waterfall: Free OCR → Paid AI → Manual review/ Double-check price validation
  if (transaction.litres && transaction.pricePerLitre) {
    const calculatedPrice = transaction.totalAmount / transaction.litres;
    const priceDiff = Math.abs(calculatedPrice - transaction.pricePerLitre);
    
    if (priceDiff > 5) { // More than 5 KES difference
      transaction.issues.push({
        field: 'litres',
        severity: 'warning',
        message: `Price mismatch: ${calculatedPrice.toFixed(2)} vs ${transaction.pricePerLitre}`
      });
      transaction.confidence = 50;
    } else {
      transaction.validated = true;
      transaction.confidence = ocrData.confidence;
    }
  }
  
  return transaction;
}
```

---

## Improved Processing Flow

```
1. USER CAPTURES RECEIPT
   ↓
2. DECODE QR CODE
   ├─ html5-qrcode (browser)
   ├─ @zxing/library (Node.js)
   └─ Output: KRA URL
   ↓
3. SCRAPE KRA WEBSITE ⭐ NEW!
   ├─ Puppeteer (if JS-rendered)
   ├─ Cheerio (if static HTML)
   └─ Extract: merchant, PIN, amount, date, invoice#
   └─ CHECK: Does it have line items with litres? ✓
   ↓
4. IF LITRES FOUND → DONE! (100% confidence)
   ↓
5. IF LITRES MISSING → OCR
   ├─ Try Tesseract (free) first
   ├─ If confidence < 80% → Gemini Vision
   └─ Extract: litres, fuel type
   ↓
6. VALIDATE
   ├─ price = total ÷ litres
   ├─ Check: 160 < price < 250
   └─ Calculate confidence score
   ↓
7. RESULT
   ├─ COMPLETE (confidence > 80%) → Notify user ✓
   └─ INCOMPLETE → Show review modal
```

---

## Processing States

| State | Description | Duration | User Action |
|-------|-------------|----------|-------------|
| `uploading` | Image being uploaded to server | 2-5s | Wait |
| `processing` | Server extracting QR + OCR data | 30-120s | Wait (or close app) |
| `verified` | All data extracted successfully | N/A | View transaction |
| `needs_review` | Missing litres or fuel type | N/A | Fill missing fields |
| `failed` | No QR code found or invalid receipt | N/A | Retry or manual entry |

---

## Confidence Scoring

```python
def calculate_confidence(price_per_litre, fuel_type):
    """
    Calculate OCR confidence based on price validation
    """
    if not fuel_type:
        # No fuel type - general validation
        if 160 <= price_per_litre <= 250:
            return 85
        return 30
    
    # Fuel-specific validation
    price_ranges = {
        'PETROL': (170, 230),
        'DIESEL': (160, 220),
        'SUPER': (180, 240),
        'GAS': (100, 150),
        'KEROSENE': (140, 180)
    }
    
    min_price, max_price = price_ranges.get(fuel_type, (160, 250))
    
    if min_price <= price_per_litre <= max_price:
        return 99  # High confidence
    elif min_price - 20 <= price_per_litre <= max_price + 20:
        return 70  # Medium confidence
    else:
        return 20  # Low confidence
```

---

## Notifications

When processing completes, send push notification:

**Success:**
```json
{
  "title": "Receipt Verified ✓",
  "body": "5,700 KES • 25.5L Diesel @ Mascot Petroleum",
  "action": "open_transaction",
  "transactionId": "txn_xyz789"
}
```

**Needs Review:**
```json
{
  "title": "Action Required",
  "body": "We captured 5,700 KES but need the litres amount",
  "action": "review_receipt",
  "receiptId": "rcpt_abc123"
}
```

---

## Data Storage Schema

### receipts table
```sql
CREATE TABLE receipts (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  image_url TEXT NOT NULL,
  uploaded_at TIMESTAMP NOT NULL,
  processed_at TIMESTAMP,
  status VARCHAR(20),
  qr_data JSONB,
  ocr_data JSONB,
  issues JSONB,
  INDEX(user_id, uploaded_at)
);
```

### transactions table
```sql
CREATE TABLE transactions (
  id VARCHAR(50) PRIMARY KEY,
  receipt_id VARCHAR(50) REFERENCES receipts(id),
  user_id VARCHAR(50) NOT NULL,
  
  -- Merchant
  merchant_name VARCHAR(255),
  merchant_pin VARCHAR(50),
  location VARCHAR(255),
  
  -- Financial
  date TIMESTAMP NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  litres DECIMAL(6, 2),
  price_per_litre DECIMAL(6, 2),
  
  -- Fuel
  fuel_type VARCHAR(20),
  
  -- KRA
  invoice_number VARCHAR(100),
  receipt_number VARCHAR(100),
  till_number VARCHAR(50),
  
  -- Validation
  validated BOOLEAN DEFAULT FALSE,
  confidence INT,
  
  INDEX(user_id, date),
  INDEX(merchant_pin)
);
```

---

## Testing the Algorithm

**Test Cases:**

1. **Perfect Receipt (Rubis)** - Has QR + Clear text
   - Expected: 100% extraction, verified
   
2. **Handwritten Receipt (Mascot)** - Has QR + Handwritten litres
   - Expected: QR extracted, OCR may fail → needs_review
   
3. **PDQ Slip (KCB Payment)** - Has payment details only
   - Expected: Amount extracted, no litres → needs_review
   
4. **No QR Receipt** - Old style receipt
   - Expected: Full OCR fallback, lower confidence

---

## Error Handling

```python
def process_receipt_with_fallback(image_path):
    """
    Robust processing with fallback strategies
    """
    try:
        # Try QR extraction first
        qr_data = extract_qr_code(image_path)
        if not qr_data:
            # Fallback: Full OCR extraction
            qr_data = extract_total_from_ocr(image_path)
        
        # Extract fuel data
        ocr_data = extract_fuel_data(image_path, qr_data['totalAmount'])
        
        # Create transaction
        transaction = create_transaction(qr_data, ocr_data)
        
        return {
            'status': 'verified' if transaction['validated'] else 'needs_review',
            'transaction': transaction
        }
    
    except Exception as e:
        log_error(e)
        return {
            'status': 'failed',
            'error': str(e)
        }
```

---

**Summary:**

This backend processes receipts by:
1. **QR Code → High Confidence Data** (Merchant, Amount, Date)
2. **OCR → Fuel Data** (Litres, Type) validated by price math
3. **Merge → Transaction** with confidence scoring
4. **Notify User → Success or Review Required**
