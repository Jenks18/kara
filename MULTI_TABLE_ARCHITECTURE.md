# Multi-Table Receipt Processing Architecture

## Overview

Your receipt processing system uses a **two-table architecture** that separates raw scraped data from clean UI-ready data.

## Table Structure

### 1. `raw_receipts` - Complete Data Store
**Purpose**: Stores ALL scraped data in separate columns for audit/reprocessing

**Contains**:
- ✅ QR Code data (`qr_code_raw_text`, `qr_code_parsed`)
- ✅ OCR text (`ocr_full_text`, `ocr_lines`)
- ✅ KRA scraped data (`kra_data`, `kra_verification_status`)
- ✅ Gemini AI responses (`ai_vision_data`, `ai_extracted_fields`)
- ✅ Image metadata (size, dimensions, hash)
- ✅ GPS location data
- ✅ Processing timestamps and confidence scores

**Key Points**:
- Immutable historical record
- Each data source has its own columns
- Never deleted (for audit trail)
- Created automatically by `receiptProcessor.process()`

### 2. `expense_items` - Clean UI Data
**Purpose**: Stores ONLY the finalized data that appears in the app

**Contains**:
- Merchant name (extracted from best available source)
- Transaction date
- Amount
- Category (Fuel, Grocery, etc.)
- Processing status (scanning, processed, error)
- `raw_receipt_id` - Links back to `raw_receipts`

**Key Points**:
- User-facing data only
- Extracted from `raw_receipts` using priority:
  1. KRA data (most reliable)
  2. Gemini AI extraction
  3. Parsed OCR data
  4. QR code data
- Can be updated/corrected by user
- Always references parent `raw_receipt_id`

## Data Flow

```
📸 Receipt Image
    ↓
🔄 receiptProcessor.process()
    ↓
💾 raw_receipts table
    ├── QR Code: "INV123456..."
    ├── OCR Text: "TOTAL KENYA\nKES 1000..."
    ├── KRA Data: {"merchant": "Total", "amount": 1000}
    └── Gemini: {"category": "Fuel", "confidence": 95}
    ↓
✨ Best data extracted
    ↓
📱 expense_items table
    ├── merchant_name: "Total Kenya"
    ├── amount: 1000
    ├── category: "Fuel"
    └── raw_receipt_id: [link to raw data]
    ↓
👀 User sees in app
```

## Why This Architecture?

### Benefits:
1. **Audit Trail**: All raw data preserved forever
2. **Reprocessing**: Can re-extract if AI improves
3. **Debugging**: Can see exactly what each scanner found
4. **Data Quality**: Multiple sources = better accuracy
5. **User Corrections**: Clean table can be edited without losing raw data

### Example:
```sql
-- Get the full raw data for an expense
SELECT 
  ei.merchant_name,
  ei.amount,
  rr.qr_code_raw_text,
  rr.ocr_full_text,
  rr.kra_data,
  rr.ai_extracted_fields
FROM expense_items ei
LEFT JOIN raw_receipts rr ON ei.raw_receipt_id = rr.id
WHERE ei.id = '...';
```

## Migration

To add the `raw_receipt_id` link to your existing database:

```bash
# Apply migration
./scripts/apply-migration-003.sh

# Or manually run:
psql $DATABASE_URL -f migrations/003-link-raw-receipts-to-expense-items.sql
```

## Code References

- **Processor**: `lib/receipt-processing/orchestrator.ts` - Creates raw_receipts
- **API Route**: `app/api/receipts/upload/route.ts` - Creates expense_items and links them
- **Raw Storage**: `lib/receipt-processing/raw-storage.ts` - Handles raw_receipts CRUD
- **Schema**: `lib/supabase/optimal-receipt-schema.sql` - Full table definitions

## Future Enhancements

- [ ] Background job to reprocess old receipts with improved AI
- [ ] Analytics on raw data accuracy by source
- [ ] User feedback loop to improve extraction confidence
- [ ] Export raw data for ML training
