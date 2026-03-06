-- MIGRATION 032: Add etims_qr_url column to expense_items
-- Stores the full KRA eTIMS QR code URL (e.g. https://itax.kra.go.ke/KRA-Portal/invoiceChk.htm?...)
-- so it's queryable as a first-class field rather than buried in receipt_details JSON.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expense_items' AND column_name = 'etims_qr_url'
  ) THEN
    ALTER TABLE expense_items ADD COLUMN etims_qr_url TEXT;
    COMMENT ON COLUMN expense_items.etims_qr_url IS 'Full eTIMS/KRA QR code URL for verification';
  END IF;
END $$;

-- Backfill from receipt_details JSON for existing rows
UPDATE expense_items
SET etims_qr_url = receipt_details->>'etimsQrUrl'
WHERE etims_qr_url IS NULL
  AND receipt_details->>'etimsQrUrl' IS NOT NULL;
