-- Migration 003: Link expense_items to raw_receipts
-- Purpose: Add raw_receipt_id column to expense_items table to link clean UI data with raw scraped data
-- This enables the multi-table architecture: raw_receipts (audit trail) → expense_items (user-facing)

-- Add raw_receipt_id column to expense_items
ALTER TABLE expense_items 
ADD COLUMN IF NOT EXISTS raw_receipt_id UUID REFERENCES raw_receipts(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_expense_items_raw_receipt ON expense_items(raw_receipt_id);

-- Add comment explaining the relationship
COMMENT ON COLUMN expense_items.raw_receipt_id IS 'Links to raw_receipts table containing all scraped data (QR, OCR, KRA, Gemini)';

-- Verify the migration
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'expense_items' 
AND column_name = 'raw_receipt_id';
