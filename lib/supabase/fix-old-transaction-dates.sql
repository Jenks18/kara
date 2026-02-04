-- ==========================================
-- FIX OLD TRANSACTION DATES
-- Run this in Supabase SQL Editor
-- ==========================================

-- This fixes receipts with old/invalid transaction dates
-- by setting them to their upload date (created_at)

-- Preview what will be updated
SELECT 
  id,
  merchant_name,
  transaction_date as old_date,
  created_at::date as new_date,
  created_at
FROM expense_items
WHERE transaction_date < (CURRENT_DATE - INTERVAL '2 years')
  OR transaction_date > CURRENT_DATE
ORDER BY created_at DESC
LIMIT 50;

-- Update receipts with invalid dates (uncomment to run):
/*
UPDATE expense_items
SET transaction_date = created_at::date
WHERE transaction_date < (CURRENT_DATE - INTERVAL '2 years')
  OR transaction_date > CURRENT_DATE;
*/

-- Verify the fix:
/*
SELECT 
  id,
  merchant_name,
  transaction_date,
  created_at
FROM expense_items
ORDER BY created_at DESC
LIMIT 20;
*/
