# eTIMS QR Tracking - Migration Guide

## ✅ What Was Completed

### 1. Database Migrations

**Migration 011 - Fixed** (`migrations/011-workspace-collaboration.sql`)
- ✅ Added `DROP POLICY IF EXISTS` statements to prevent errors on re-run
- Now safe to apply multiple times

**Migration 012 - NEW** (`migrations/012-add-etims-tracking.sql`)
- ✅ Adds eTIMS QR tracking columns to `raw_receipts`:
  - `etims_qr_detected` (boolean) - Flag when QR code is found
  - `etims_qr_url` (text) - The eTIMS/KRA URL from QR code
  - `ai_etims_detected` (boolean) - AI vision detected QR in image
  - `receipt_metadata` (jsonb) - Flexible storage for ALL receipt details
  - `receipt_full_text` (text) - Complete OCR text (bag of words for search)

- ✅ Adds eTIMS fields to `expense_items`:
  - `has_etims_qr` (boolean) - Quick flag for UI "KRA Verified" badge
  - `receipt_details` (jsonb) - User-facing receipt details (items, fuel data, etc.)
  - `receipt_full_text` (text) - Complete OCR text for full-text search

- ✅ Backfills existing KRA-verified receipts with `has_etims_qr = TRUE`
- ✅ Creates indexes for fast filtering by eTIMS status
- ✅ Creates full-text search indexes (GIN) on both `receipt_full_text` columns

### 2. AI Model Updates

**Generalized for ALL Receipt Types**
- ✅ Removed fuel-station bias from prompts
- ✅ Updated categories: Food, Transport, Shopping, Fuel, Entertainment, Utilities, Health, Other
- ✅ AI now treats all business types equally

**Captures ALL Receipt Details**
- ✅ Fuel receipts: litres, fuelType, pricePerLitre, pumpNumber, vehicleNumber
- ✅ Restaurant receipts: tableNumber, serverName, covers (number of people)
- ✅ Transport receipts: routeFrom, routeTo, tripId, vehicleReg
- ✅ Payment info: paymentMethod (M-PESA/Cash/Card), tillNumber
- ✅ Items array: description, quantity, unitPrice, totalPrice

**eTIMS QR Detection**
- ✅ AI prompt explicitly asks about QR codes
- ✅ Sets `hasEtimsQR: true` when QR visible in image
- ✅ Detects URLs: `itax.kra.go.ke`, `etims.kra.go.ke`, `kra.go.ke/verify`

### 3. QR Code Detection

**Enhanced QR Decoder**
- ✅ Added `isEtimsQR` flag to `QRCodeData` interface
- ✅ Detects multiple eTIMS URL patterns
- ✅ Works with mobile ML Kit QR detection and server-side ZXing

### 4. Upload API Updates

**Web API** (`app/api/receipts/upload/route.ts`)
- ✅ Sets `has_etims_qr` flag on expense_items
- ✅ Stores `receipt_details` (items + metadata)
- ✅ Returns `hasEtimsQR` in response for UI

**Mobile API** (`app/api/mobile/receipts/upload/route.ts`)
- ✅ Same eTIMS detection logic as web
- ✅ Graceful handling of missing columns (Supabase ignores undefined)

**Raw Storage** (`lib/receipt-processing/raw-storage.ts`)
- ✅ Saves all eTIMS flags to database
- ✅ Builds `receipt_metadata` from captured data
- ✅ Handles both new and old database schemas

### 5. Data Structure

```typescript
// raw_receipts table - COMPLETE AUDIT TRAIL
{
  etims_qr_detected: boolean,        // QR scanner found eTIMS
  etims_qr_url: string,              // The KRA verification URL
  ai_etims_detected: boolean,        // AI vision detected QR
  receipt_full_text: string,         // Complete OCR text (bag of words)
  receipt_metadata: {
    gemini: {
      litres: 37.5,                  // Fuel-specific
      fuelType: "PETROL",
      pumpNumber: "3",
      tableNumber: "12",             // Restaurant-specific
      serverName: "John",
      routeFrom: "Nairobi",          // Transport-specific
      routeTo: "Mombasa"
    },
    items: [
      {description: "Bread", quantity: 2, totalPrice: 120},
      {description: "Milk", quantity: 1, totalPrice: 85}
    ]
  }
}

// expense_items table - USER-FACING
{
  has_etims_qr: boolean,             // Show "KRA Verified" badge
  receipt_details: {
    items: [...],                     // What they bought
    metadata: {...}                   // Category-specific details
  }
}
```

---

## 🚀 Next Steps (USER ACTION REQUIRED)

### Step 1: Apply Database Migrations

Open Supabase Dashboard → SQL Editor:

```sql
-- 1. Apply Migration 011 (workspace collaboration)
-- Copy and paste entire contents of migrations/011-workspace-collaboration.sql
-- RUN

-- 2. Apply Migration 012 (eTIMS tracking)
-- Copy and paste entire contents of migrations/012-add-etims-tracking.sql
-- RUN
```

### Step 2: Verify Migration Success

Check tables were updated:

```sql
-- Check raw_receipts has new columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'raw_receipts' 
AND column_name IN ('etims_qr_detected', 'etims_qr_url', 'receipt_metadata', 'receipt_full_text');

-- Check expense_items has new columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'expense_items' 
AND column_name IN ('has_etims_qr', 'receipt_details', 'receipt_full_text');

-- Should return 7 rows total (4 + 3)
```

### Step 3: Test eTIMS Detection

1. **Upload a receipt with an eTIMS QR code** (any KRA-compliant business)
2. Check the database:

```sql
-- Check raw_receipts
SELECT 
  image_url,
  etims_qr_detected,
  etims_qr_url,
  ai_etims_detected,
  receipt_metadata,
  receipt_full_text
FROM raw_receipts
ORDER BY created_at DESC
LIMIT 1;

-- Check expense_items
SELECT 
  merchant_name,
  amount,
  has_etims_qr,
  kra_verified,
  receipt_details,
  receipt_full_text
FROM expense_items
ORDER BY created_at DESC
LIMIT 1;
```

3. **Verify in UI**:
   - Receipt should show "KRA Verified" badge (if `has_etims_qr = TRUE`)
   - Details should include items and metadata

### Step 4: Test Different Receipt Types

Upload examples to verify AI captures all details:

- ✅ **Fuel station** (Shell, Total) - Should capture: litres, fuel type, pump number
- ✅ **Supermarket** (Naivas, Carrefour) - Should capture: items list with prices
- ✅ **Restaurant** (Java House, KFC) - Should capture: table number, server, items
- ✅ **Transport** (Uber, SGR) - Should capture: from/to locations, trip ID
- ✅ **Mobile money** (M-PESA) - Should capture: transaction ID, payment method

### Step 5: Backfill Existing Receipts (Optional)

If you have old receipts without eTIMS flags:

```sql
-- Mark receipts with KRA invoice numbers
UPDATE expense_items 
SET has_etims_qr = TRUE 
WHERE kra_verified = TRUE 
  AND kra_invoice_number IS NOT NULL
  AND (has_etims_qr = FALSE OR has_etims_qr IS NULL);

-- Update raw_receipts from QR data
UPDATE raw_receipts
SET etims_qr_detected = TRUE,
    etims_qr_url = raw_qr_data->>'url'
WHERE (raw_qr_data->>'url' LIKE '%itax.kra.go.ke%' 
   OR raw_qr_data->>'url' LIKE '%etims.kra.go.ke%')
  AND (etims_qr_detected = FALSE OR etims_qr_detected IS NULL);
```

---

## 📊 What This Enables

### For Users
- ✅ **KRA Verified badge** on receipts with eTIMS QR codes
- ✅ **Detailed receipt view** - see items, fuel details, transport info
- ✅ **Better categorization** - AI understands all business types
- ✅ **Rich data** for expense reports and analytics
- ✅ **Full-text search** - find receipts by any text (merchant, items, locations)

### For Analytics/Intelligence
- ✅ **Full receipt data** stored in `receipt_metadata` for ML training
- ✅ **Bag of words** in `receipt_full_text` for text mining and pattern analysis
- ✅ **Flexible schema** - capture ANY detail without table changes
- ✅ **Reprocessing capability** - raw data preserved for future improvements
- ✅ **Pattern detection** - correlate fuel prices, restaurant spending, routes
- ✅ **Search indexing** - GIN indexes enable fast full-text queries

### For Compliance
- ✅ **eTIMS verification** - track KRA-compliant receipts
- ✅ **Audit trail** - link expense items back to raw receipt data
- ✅ **Automatic flags** - identify receipts needing review

---

## 🐛 Troubleshooting

### Migration 011 fails with "policy already exists"
✅ **FIXED** - Re-run migration 011, it now includes `DROP POLICY IF EXISTS`

### Migration 012 fails
- Check if columns already exist: `\d raw_receipts` and `\d expense_items`
- Migration is idempotent (safe to re-run)

### eTIMS flag not showing in UI
1. Check `has_etims_qr` in database: `SELECT has_etims_qr FROM expense_items LIMIT 10`
2. If column doesn't exist: Apply migration 012
3. If column exists but NULL: Run backfill query from Step 5

### Receipt details not captured
1. Check `receipt_metadata` in raw_receipts
2. Check `receipt_details` in expense_items
3. Verify Gemini API key is set: `echo $GEMINI_API_KEY`
4. Check logs for AI processing errors

---

## 📝 Files Changed

```
migrations/
  011-workspace-collaboration.sql    ← Fixed policy conflicts
  012-add-etims-tracking.sql         ← NEW: eTIMS columns

lib/receipt-processing/
  ocr-ai.ts                          ← Generalized prompts, added metadata
  qr-decoder.ts                      ← Added isEtimsQR flag
  raw-storage.ts                     ← Save eTIMS flags and metadata
  orchestrator.ts                    ← Detect eTIMS QR in pipeline

app/api/
  receipts/upload/route.ts           ← Set has_etims_qr, store receipt_details
  mobile/receipts/upload/route.ts    ← Same for mobile
```

---

## ✨ Summary

**Before:** Receipt processing was biased toward fuel stations, only captured basic data (merchant, amount, date)

**After:** 
- ✅ All receipt types treated equally (food, transport, shopping, etc.)
- ✅ Captures EVERY detail (items, fuel data, restaurant info, transport routes)
- ✅ Stores complete OCR text for search and analysis
- ✅ Tracks eTIMS QR codes for KRA compliance
- ✅ Shows "KRA Verified" badges in UI
- ✅ Flexible data storage for future AI/ML features
- ✅ Full-text search ready with PostgreSQL GIN indexes

**Next up:** Apply migrations in Supabase, then test with various receipt types! 🚀
