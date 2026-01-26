-- Migration: Link expense_items to raw_receipts
-- This creates the proper multi-table architecture:
-- 1. raw_receipts = ALL scraped data (QR, OCR, KRA, Gemini)
-- 2. expense_items = Clean/finalized data for app UI

-- Add raw_receipt_id to expense_items
ALTER TABLE expense_items 
ADD COLUMN IF NOT EXISTS raw_receipt_id UUID REFERENCES raw_receipts(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_expense_items_raw_receipt ON expense_items(raw_receipt_id);

-- Add comment explaining the relationship
COMMENT ON COLUMN expense_items.raw_receipt_id IS 'Links to raw_receipts table containing all scraped data (QR, OCR, KRA, Gemini)';
