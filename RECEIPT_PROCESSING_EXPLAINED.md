# 📋 Receipt Processing Logic Explained

## 🎯 High-Level Flow

```
📸 Receipt Photo
    ↓
┌───────────────────────────────────┐
│  Upload to /api/receipts/upload  │
└───────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────────────────┐
│         THREE PARALLEL DATA EXTRACTIONS                   │
├───────────────────────────────────────────────────────────┤
│  1️⃣ QR Code      2️⃣ KRA Website    3️⃣ Receipt OCR       │
│  (100% trust)   (100% trust)      (variable trust)      │
└───────────────────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────┐
│   Intelligent Data Merging        │
│   Priority: KRA > QR > OCR        │
└───────────────────────────────────┘
    ↓
💾 Save to Database (expense_items)
```

---

## 📱 Step 1: QR Code Extraction (100% Confidence)

**File:** `lib/receipt-processing/qr-decoder.ts`

### What It Does
- Scans receipt image for QR code using `@zxing/library`
- Extracts structured data directly from QR
- NO dependency on other steps

### Data Formats Supported

**Format 1: KRA URL**
```
https://itax.kra.go.ke/KRA-Portal/invoiceChk.htm?actionCode=loadPage&invoiceNumber=...
```
Returns:
```typescript
{
  rawText: "https://itax.kra.go.ke/...",
  url: "https://itax.kra.go.ke/...",
  confidence: 100
}
```

**Format 2: JSON**
```json
{
  "invoice": "INV-2024-001",
  "merchant": "Total Kenya",
  "amount": 5000.50,
  "date": "2024-01-13T10:30:00"
}
```
Returns:
```typescript
{
  rawText: "{...}",
  url: null,
  invoiceNumber: "INV-2024-001",
  merchantName: "Total Kenya",
  totalAmount: 5000.50,
  dateTime: "2024-01-13T10:30:00",
  confidence: 100
}
```

**Format 3: Key-Value Pairs**
```
INV=123,AMT=5000,MERCHANT=Total,TILL=12345
```
Returns:
```typescript
{
  rawText: "INV=123,...",
  url: null,
  invoiceNumber: "123",
  totalAmount: 5000,
  merchantName: "Total",
  tillNumber: "12345",
  confidence: 100
}
```

### Key Point
**QR data is 100% accurate** - it's machine-readable, no OCR errors possible.

---

## 🌐 Step 2: KRA Website Scraping (Optional, 100% Confidence)

**File:** `lib/receipt-processing/kra-scraper.ts`

### When It Runs
**ONLY** if Step 1 found a KRA URL in the QR code.

### What It Does
1. Takes the KRA URL from QR code
2. Fetches the invoice page from KRA server
3. Parses HTML to extract verified tax data

### Data Extracted
```typescript
{
  invoiceNumber: "1000123456",
  traderInvoiceNo: "TILL-001",
  merchantName: "TOTAL KENYA LIMITED",
  totalAmount: 5000.00,
  taxableAmount: 4464.29,
  vatAmount: 535.71,
  invoiceDate: "13/01/2024",
  verified: true,
  source: "kra_website",
  confidence: 100
}
```

### Key Point
**KRA data is 100% accurate** - it's official tax authority verification.

---

## 🔍 Step 3: Receipt Image OCR (Variable Confidence)

**Files:** 
- `lib/receipt-processing/ocr-free.ts` (Tesseract - free)
- `lib/receipt-processing/ocr-ai.ts` (Gemini - paid fallback)

### What It Does
Extracts ALL visible text from the receipt image, independent of QR/KRA.

### Phase A: Tesseract OCR (Free)

**Process:**
1. Convert image to base64
2. Run Tesseract.js on image
3. Extract raw text
4. Parse text using regex patterns

**Data Extracted:**
```typescript
{
  // Financial
  totalAmount: 5234.00,
  subtotal: 4680.00,
  vatAmount: 554.00,
  
  // Merchant
  merchantName: "TOTAL KENYA",
  location: "WESTLANDS BRANCH",
  
  // Fuel Specific
  litres: 26.17,
  fuelType: "DIESEL",
  pricePerLitre: 200.00,
  
  // Transaction Details
  pumpNumber: "4",
  attendantName: "JOHN DOE",
  vehicleNumber: "KBZ 123X",
  transactionDate: "13/01/2024",
  transactionTime: "10:30:45",
  
  // Metadata
  confidence: 75,  // 0-100 based on fields found
  source: "tesseract_ocr",
  rawText: "TOTAL KENYA\nWESTLANDS..."
}
```

**Confidence Calculation:**
```typescript
let confidence = 0;
if (merchantName) confidence += 15;
if (totalAmount) confidence += 25;
if (litres) confidence += 30;
if (fuelType) confidence += 15;
if (pricePerLitre in valid range) confidence += 15;
// Max = 100%
```

### Phase B: Gemini Vision AI (Paid Fallback)

**When It Runs:**
```typescript
if (tesseractConfidence < 60 && (hasQRData || hasKRAData)) {
  // Use Gemini to improve fuel data
}
```

**Why:**
- Tesseract struggles with:
  - Low quality images
  - Faded receipts
  - Complex layouts
  - Handwriting
- Gemini excels at:
  - Visual understanding
  - Context awareness
  - Multi-lingual text

**What Gemini Does:**
1. Takes the image + context from QR/KRA
2. Uses AI vision to extract fuel-specific data
3. Returns ONLY fuel fields (not financial - we trust QR/KRA for that)

**Data From Gemini:**
```typescript
{
  litres: 26.2,
  fuelType: "DIESEL",
  pricePerLitre: 199.85,
  pumpNumber: "4",
  vehicleNumber: "KBZ 123X",
  confidence: 90,
  source: "gemini_vision"
}
```

**Merged Result:**
```typescript
receiptData = {
  // Financial from Tesseract
  totalAmount: tesseract.totalAmount,
  
  // Fuel from Gemini (better quality)
  litres: gemini.litres,
  fuelType: gemini.fuelType,
  pricePerLitre: gemini.pricePerLitre,
  
  // Best of both
  confidence: Math.max(tesseract.confidence, gemini.confidence),
  source: "tesseract_ocr + gemini_vision"
}
```

---

## 🔀 Step 4: Intelligent Data Merging

**File:** `app/api/receipts/upload/route.ts` (lines 117-180)

### Priority Rules

**For Financial Data:**
```
KRA (100%) > QR (100%) > Receipt OCR (0-100%)
```

**For Fuel Data:**
```
Receipt OCR only (QR/KRA don't have fuel details)
```

### Merged Transaction Object

```typescript
{
  // === FINANCIAL DATA (highest confidence source) ===
  invoiceNumber: kra?.invoiceNumber || qr.invoiceNumber || null,
  merchantName: kra?.merchantName || qr.merchantName || ocr.merchantName,
  totalAmount: kra?.totalAmount || qr.totalAmount || ocr.totalAmount,
  vatAmount: kra?.vatAmount || ocr.vatAmount,
  
  // === FUEL DATA (OCR only) ===
  litres: ocr.litres,
  fuelType: ocr.fuelType,
  pricePerLitre: ocr.pricePerLitre,
  pumpNumber: ocr.pumpNumber,
  vehicleNumber: ocr.vehicleNumber,
  
  // === METADATA ===
  transactionDate: kra?.invoiceDate || qr.dateTime || ocr.transactionDate,
  overallConfidence: calculateOverallConfidence(),
  
  // === AUDIT TRAIL (all sources preserved) ===
  sources: {
    qr: {...},
    kra: {...},
    ocr: {...}
  }
}
```

### Overall Confidence Calculation

```typescript
function calculateOverallConfidence() {
  const sources = [];
  
  if (hasQRData) sources.push(100);
  if (hasKRAData) sources.push(100);
  if (hasOCRData) sources.push(ocrConfidence);
  
  // Average of all sources
  return sources.reduce((a, b) => a + b, 0) / sources.length;
}
```

**Example Results:**
- QR + KRA + OCR(80%) = (100 + 100 + 80) / 3 = **93% confidence**
- QR + OCR(60%) = (100 + 60) / 2 = **80% confidence**
- OCR(40%) only = **40% confidence**

---

## 💾 Step 5: Save to Database

**File:** `lib/api/expense-reports.ts`

### Process

1. **Upload Image to Supabase Storage**
   ```typescript
   const imageUrl = await uploadReceiptImage(imageData, reportId);
   // Returns: https://...supabase.co/storage/v1/object/public/receipts/...
   ```

2. **Create Expense Report**
   ```typescript
   const report = await supabase
     .from('expense_reports')
     .insert({
       user_id: clerkUserId,
       title: "Fuel Receipt",
       status: "draft",
       total_amount: mergedData.totalAmount
     })
   ```

3. **Create Expense Items**
   ```typescript
   const items = await supabase
     .from('expense_items')
     .insert({
       report_id: report.id,
       image_url: imageUrl,
       amount: mergedData.totalAmount,
       litres: mergedData.litres,
       fuel_type: mergedData.fuelType,
       processing_status: "processed",
       merchant_name: mergedData.merchantName,
       transaction_date: mergedData.transactionDate,
       confidence_score: mergedData.overallConfidence
     })
   ```

---

## 🔍 Current Issues & Improvements Needed

### Issue 1: Gallery Images Not Displaying ❌
**Problem:** Vercel deployment missing Next.js image config
**Status:** Fixed in code, waiting for deployment
**Solution:** `next.config.js` updated with Supabase domain

### Issue 2: Storage Bucket Not Created ❌
**Problem:** SQL migration not run yet
**Status:** Waiting for you to run `apply-migrations.sql`
**Impact:** Images upload but can't be retrieved

### Issue 3: Tesseract Accuracy 📉
**Current:** 40-70% confidence on complex receipts
**Needs:**
- Better preprocessing (contrast, rotation correction)
- Receipt-specific training data
- More robust regex patterns

### Issue 4: Gemini Fallback Not Tested ⚠️
**Status:** Code exists but no API key configured
**Needs:** Google AI API key in `.env.local`

### Issue 5: No Error Recovery 🔄
**Problem:** If OCR fails, user sees generic error
**Needs:** Fallback to manual entry form

---

## 🚀 Suggested Improvements

### 1. **Image Preprocessing** (Before OCR)
```typescript
function preprocessImage(buffer: Buffer) {
  // Rotate if sideways
  // Increase contrast
  // Sharpen text
  // Crop to receipt only (remove background)
  return enhancedBuffer;
}
```

### 2. **Receipt Type Detection**
```typescript
if (hasQRCode && fuelPatterns) return "FUEL_WITH_QR";
if (hasQRCode) return "GENERAL_WITH_QR";
if (fuelPatterns) return "FUEL_NO_QR";
return "GENERAL_NO_QR";
```

### 3. **Confidence-Based UI**
```typescript
if (confidence >= 80) {
  // Auto-save, show success
} else if (confidence >= 50) {
  // Show pre-filled form, let user verify
} else {
  // Show empty form, manual entry
}
```

### 4. **Better Regex Patterns**
Current: `/(TOTAL|AMOUNT).*?(\d+\.?\d*)/`
Improved: Train on real Kenyan receipts, handle:
- Different currencies (KSH, KES, Ksh)
- Various date formats (DD/MM/YYYY, YYYY-MM-DD)
- Merchant name variations

### 5. **Parallel Processing**
```typescript
const [qrResult, ocrResult] = await Promise.all([
  decodeQRFromImage(buffer),
  extractWithTesseract(buffer)
]);
// Don't wait for QR before starting OCR
```

---

## 📊 Testing Checklist

- [ ] QR code with KRA URL → Full verification
- [ ] QR code with JSON data → Structured parsing
- [ ] QR code with key-value → Parse correctly
- [ ] No QR code → OCR only
- [ ] Low quality image → Gemini fallback
- [ ] Multiple receipts → Batch processing
- [ ] Non-fuel receipt → General expense
- [ ] Camera photo → Upload + display
- [ ] Gallery photo → Upload + display
- [ ] Error handling → Graceful degradation

---

## 🎯 Priority Fixes

1. **Run SQL migration** (apply-migrations.sql) - 2 min ⚡
2. **Test current flow** with real receipts - 10 min
3. **Add image preprocessing** - 2 hours
4. **Improve regex patterns** - 4 hours
5. **Add confidence-based UI** - 2 hours
6. **Configure Gemini API** - 30 min

Ready to test? Let's start with running the SQL migration!
