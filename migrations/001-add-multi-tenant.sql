-- Multi-tenant schema migration for Clerk integration
-- Run this in Supabase SQL editor

-- 1. Add user_id column to expense_reports
ALTER TABLE expense_reports 
ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT 'legacy-user';

-- 2. Add index for user_id queries
CREATE INDEX IF NOT EXISTS idx_expense_reports_user_id ON expense_reports(user_id);

-- 3. Add index for queries by user and date
CREATE INDEX IF NOT EXISTS idx_expense_reports_user_created ON expense_reports(user_id, created_at DESC);

-- 4. Add user_id to expense_items via report_id relationship (indirect)
-- expense_items already has report_id which links to user through expense_reports

-- 5. Update RLS policies for multi-tenant access
-- Enable RLS on expense_reports
ALTER TABLE expense_reports ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON expense_reports;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON expense_reports;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON expense_reports;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON expense_reports;

-- Create new multi-tenant policies
CREATE POLICY "Users can insert their own reports"
ON expense_reports FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can view their own reports"
ON expense_reports FOR SELECT
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own reports"
ON expense_reports FOR UPDATE
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own reports"
ON expense_reports FOR DELETE
USING (auth.uid()::text = user_id);

-- Enable RLS on expense_items
ALTER TABLE expense_items ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON expense_items;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON expense_items;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON expense_items;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON expense_items;

-- Create new multi-tenant policies for expense_items
CREATE POLICY "Users can insert items for their reports"
ON expense_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM expense_reports 
    WHERE id = report_id AND user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can view items from their reports"
ON expense_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM expense_reports 
    WHERE id = report_id AND user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can update items in their reports"
ON expense_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM expense_reports 
    WHERE id = report_id AND user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can delete items from their reports"
ON expense_items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM expense_reports 
    WHERE id = report_id AND user_id = auth.uid()::text
  )
);

-- Done!
-- Note: Clerk user IDs will be automatically used via auth.uid()
SELECT 'Multi-tenant schema migration completed' as status;
