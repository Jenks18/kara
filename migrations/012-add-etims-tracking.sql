-- ============================================
-- MIGRATION 012: eTIMS QR Code Tracking
-- ============================================
-- Add columns to track eTIMS QR codes on receipts
-- eTIMS = Electronic Tax Invoice Management System by KRA

BEGIN;

-- ========================================
-- 1. RAW_RECEIPTS: Add eTIMS tracking
-- ========================================

-- Add eTIMS QR detection flag
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'raw_receipts' AND column_name = 'etims_qr_detected'
  ) THEN
    ALTER TABLE raw_receipts ADD COLUMN etims_qr_detected BOOLEAN DEFAULT FALSE;
    CREATE INDEX IF NOT EXISTS idx_raw_receipts_etims ON raw_receipts(etims_qr_detected) WHERE etims_qr_detected = TRUE;
  END IF;
END $$;

-- Add eTIMS QR URL storage
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'raw_receipts' AND column_name = 'etims_qr_url'
  ) THEN
    ALTER TABLE raw_receipts ADD COLUMN etims_qr_url TEXT;
  END IF;
END $$;

-- Add AI-detected eTIMS flag (from Gemini vision)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'raw_receipts' AND column_name = 'ai_etims_detected'
  ) THEN
    ALTER TABLE raw_receipts ADD COLUMN ai_etims_detected BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Add detailed receipt metadata (stores fuel-specific and other details)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'raw_receipts' AND column_name = 'receipt_metadata'
  ) THEN
    ALTER TABLE raw_receipts ADD COLUMN receipt_metadata JSONB;
    COMMENT ON COLUMN raw_receipts.receipt_metadata IS 'Flexible storage for receipt-specific details: fuel (litres, type, pump), restaurant (table, server), transport (vehicle, route), etc.';
  END IF;
END $$;

-- Add full text content (bag of words for search and analysis)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'raw_receipts' AND column_name = 'receipt_full_text'
  ) THEN
    ALTER TABLE raw_receipts ADD COLUMN receipt_full_text TEXT;
    COMMENT ON COLUMN raw_receipts.receipt_full_text IS 'Complete OCR text from receipt - bag of words for full-text search and analysis';
    CREATE INDEX IF NOT EXISTS idx_raw_receipts_full_text ON raw_receipts USING gin(to_tsvector('english', receipt_full_text));
  END IF;
END $$;

-- ========================================
-- 2. EXPENSE_ITEMS: Add eTIMS flag for UI
-- ========================================

-- Add has_etims_qr for quick filtering in UI
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expense_items' AND column_name = 'has_etims_qr'
  ) THEN
    ALTER TABLE expense_items ADD COLUMN has_etims_qr BOOLEAN DEFAULT FALSE;
    CREATE INDEX IF NOT EXISTS idx_expense_items_etims ON expense_items(has_etims_qr) WHERE has_etims_qr = TRUE;
    COMMENT ON COLUMN expense_items.has_etims_qr IS 'Quick flag for showing KRA Verified badge in UI';
  END IF;
END $$;

-- Add receipt_details for displaying extra info (items, fuel details, etc.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expense_items' AND column_name = 'receipt_details'
  ) THEN
    ALTER TABLE expense_items ADD COLUMN receipt_details JSONB;
    COMMENT ON COLUMN expense_items.receipt_details IS 'User-facing receipt details: items bought, fuel type/litres, transport details, etc.';
  END IF;
END $$;

-- Add full text content for expense items too
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expense_items' AND column_name = 'receipt_full_text'
  ) THEN
    ALTER TABLE expense_items ADD COLUMN receipt_full_text TEXT;
    COMMENT ON COLUMN expense_items.receipt_full_text IS 'Complete OCR text from receipt - enables full-text search across expenses';
    CREATE INDEX IF NOT EXISTS idx_expense_items_full_text ON expense_items USING gin(to_tsvector('english', receipt_full_text));
  END IF;
END $$;

-- ========================================
-- 3. BACKFILL: Mark existing KRA-verified receipts
-- ========================================

-- Mark receipts as having eTIMS if they have a KRA invoice number
UPDATE expense_items 
SET has_etims_qr = TRUE 
WHERE kra_verified = TRUE 
  AND kra_invoice_number IS NOT NULL
  AND has_etims_qr = FALSE;

-- Update raw_receipts based on QR data
UPDATE raw_receipts
SET etims_qr_detected = TRUE,
    etims_qr_url = raw_qr_data->>'url'
WHERE (raw_qr_data->>'url' LIKE '%itax.kra.go.ke%' 
   OR raw_qr_data->>'url' LIKE '%etims.kra.go.ke%')
  AND etims_qr_detected = FALSE;

COMMIT;

-- Success message
SELECT 'eTIMS tracking columns added successfully!' as status;
SELECT 'Tables updated: raw_receipts (etims_qr_detected, etims_qr_url, receipt_metadata), expense_items (has_etims_qr, receipt_details)' as info;
