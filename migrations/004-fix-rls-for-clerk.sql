-- Fix RLS policies to work without Supabase Auth (using Clerk instead)
-- Temporarily allow all authenticated operations until we set up proper Clerk JWT verification

-- Drop Supabase Auth-based policies
DROP POLICY IF EXISTS "Users can insert their own reports" ON expense_reports;
DROP POLICY IF EXISTS "Users can view their own reports" ON expense_reports;
DROP POLICY IF EXISTS "Users can update their own reports" ON expense_reports;
DROP POLICY IF EXISTS "Users can delete their own reports" ON expense_reports;

DROP POLICY IF EXISTS "Users can view items through reports" ON expense_items;
DROP POLICY IF EXISTS "Users can insert items through reports" ON expense_items;
DROP POLICY IF EXISTS "Users can update items through reports" ON expense_items;
DROP POLICY IF EXISTS "Users can delete items through reports" ON expense_items;

-- Create permissive policies (authentication handled by Clerk at API layer)
CREATE POLICY "Allow all operations on expense_reports"
ON expense_reports FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all operations on expense_items"
ON expense_items FOR ALL
USING (true)
WITH CHECK (true);

-- Same for raw_receipts if it exists
DROP POLICY IF EXISTS "Users can view their own raw receipts" ON raw_receipts;
DROP POLICY IF EXISTS "Users can insert their own raw receipts" ON raw_receipts;
DROP POLICY IF EXISTS "Users can update their own raw receipts" ON raw_receipts;

CREATE POLICY "Allow all operations on raw_receipts"
ON raw_receipts FOR ALL
USING (true)
WITH CHECK (true);
