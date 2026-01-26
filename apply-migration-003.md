# Apply Migration 003 - Add raw_receipt_id to expense_items

## Quick Fix via Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/bkypfuyiknytkuhxtduc/sql/new

2. Paste this SQL:

```sql
-- Migration: Link expense_items to raw_receipts
ALTER TABLE expense_items 
ADD COLUMN IF NOT EXISTS raw_receipt_id UUID REFERENCES raw_receipts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expense_items_raw_receipt ON expense_items(raw_receipt_id);

COMMENT ON COLUMN expense_items.raw_receipt_id IS 'Links to raw_receipts table containing all scraped data (QR, OCR, KRA, Gemini)';
```

3. Click "Run" or press Cmd+Enter

4. You should see: "Success. No rows returned"

## Verify it worked

Run this query to check:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'expense_items' 
AND column_name = 'raw_receipt_id';
```

You should see:
```
column_name      | data_type
-----------------+-----------
raw_receipt_id   | uuid
```

## What this fixes

The error you're seeing:
```
"Could not find the 'raw_receipt_id' column of 'expense_items' in the schema cache"
```

Will be resolved once this migration is applied. The receipt upload will then properly link expense items to their source raw receipt data.
