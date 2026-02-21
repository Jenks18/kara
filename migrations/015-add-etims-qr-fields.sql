-- ============================================
-- MIGRATION 012: Add eTIMS QR Code Fields
-- ============================================
-- Add columns to track eTIMS/KRA QR code presence

BEGIN;

-- ========================================
-- 1. ADD eTIMS QR FIELDS TO RAW_RECEIPTS
-- ========================================

-- Check if raw_ receipts table exists before altering
DO $$
BEGIN
  -- Add flag to indicate if eTIMS QR code was detected
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'raw_receipts' AND column_name = 'etims_qr_detected'
  ) THEN
    ALTER TABLE raw_receipts ADD COLUMN etims_qr_detected BOOLEAN DEFAULT FALSE;
    CREATE INDEX IF NOT EXISTS idx_raw_receipts_etims_qr ON raw_receipts(etims_qr_detected);
  END IF;
  
  -- Add eTIMS QR URL for verification
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'raw_receipts' AND column_name = 'etims_qr_url'
  ) THEN
    ALTER TABLE raw_receipts ADD COLUMN etims_qr_url TEXT;
  END IF;
  
  -- Add flag to indicate AI detected eTIMS from image
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'raw_receipts' AND column_name = 'ai_etims_detected'
  ) THEN
    ALTER TABLE raw_receipts ADD COLUMN ai_etims_detected BOOLEAN DEFAULT FALSE;
    COMMENT ON COLUMN raw_receipts.ai_etims_detected IS 'When AI vision detects QR code in image';
  END IF;
  
END $$;

-- ========================================
-- 2. ADD eTIMS FLAG TO EXPENSE_ITEMS
-- ========================================

-- Add flag to expense items for quick filtering
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expense_items' AND column_name = 'has_etims_qr'
  ) THEN
    ALTER TABLE expense_items ADD COLUMN has_etims_qr BOOLEAN DEFAULT FALSE;
    CREATE INDEX IF NOT EXISTS idx_expense_items_etims ON expense_items(has_etims_qr);
    COMMENT ON COLUMN expense_items.has_etims_qr IS 'Receipt has verified eTIMS/KRA QR code';
  END IF;
END $$;

COMMIT;

-- Success message
SELECT 'eTIMS QR code tracking fields added successfully!' as status;
