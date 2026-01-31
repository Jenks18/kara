-- ========================================
-- FIX RLS SECURITY - URGENT
-- ========================================
-- This fixes the security vulnerability where users can see other users' data
-- Run this IMMEDIATELY in Supabase SQL Editor

-- Step 1: Drop all existing policies (including the insecure ones)
DROP POLICY IF EXISTS "Enable all access for expense_reports" ON expense_reports;
DROP POLICY IF EXISTS "Enable all access for expense_items" ON expense_items;
DROP POLICY IF EXISTS "Users can view own expense_reports" ON expense_reports;
DROP POLICY IF EXISTS "Users can create own expense_reports" ON expense_reports;
DROP POLICY IF EXISTS "Users can update own expense_reports" ON expense_reports;
DROP POLICY IF EXISTS "Users can delete own expense_reports" ON expense_reports;
DROP POLICY IF EXISTS "Users can view own expense_items" ON expense_items;
DROP POLICY IF EXISTS "Users can create own expense_items" ON expense_items;
DROP POLICY IF EXISTS "Users can update own expense_items" ON expense_items;
DROP POLICY IF EXISTS "Users can delete own expense_items" ON expense_items;

-- Step 2: Ensure RLS is enabled
ALTER TABLE expense_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_items ENABLE ROW LEVEL SECURITY;

-- Step 3: Create SECURE policies for expense_reports
CREATE POLICY "Users can view own expense_reports"
  ON expense_reports
  FOR SELECT
  TO authenticated
  USING (
    user_email = (auth.jwt()->>'email')::text
  );

CREATE POLICY "Users can create own expense_reports"
  ON expense_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_email = (auth.jwt()->>'email')::text
  );

CREATE POLICY "Users can update own expense_reports"
  ON expense_reports
  FOR UPDATE
  TO authenticated
  USING (
    user_email = (auth.jwt()->>'email')::text
  )
  WITH CHECK (
    user_email = (auth.jwt()->>'email')::text
  );

CREATE POLICY "Users can delete own expense_reports"
  ON expense_reports
  FOR DELETE
  TO authenticated
  USING (
    user_email = (auth.jwt()->>'email')::text
  );

-- Step 4: Create SECURE policies for expense_items
CREATE POLICY "Users can view own expense_items"
  ON expense_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM expense_reports
      WHERE expense_reports.id = expense_items.report_id
      AND expense_reports.user_email = (auth.jwt()->>'email')::text
    )
  );

CREATE POLICY "Users can create own expense_items"
  ON expense_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM expense_reports
      WHERE expense_reports.id = expense_items.report_id
      AND expense_reports.user_email = (auth.jwt()->>'email')::text
    )
  );

CREATE POLICY "Users can update own expense_items"
  ON expense_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM expense_reports
      WHERE expense_reports.id = expense_items.report_id
      AND expense_reports.user_email = (auth.jwt()->>'email')::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM expense_reports
      WHERE expense_reports.id = expense_items.report_id
      AND expense_reports.user_email = (auth.jwt()->>'email')::text
    )
  );

CREATE POLICY "Users can delete own expense_items"
  ON expense_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM expense_reports
      WHERE expense_reports.id = expense_items.report_id
      AND expense_reports.user_email = (auth.jwt()->>'email')::text
    )
  );

-- Step 5: Verify policies are correct
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('expense_reports', 'expense_items')
ORDER BY tablename, policyname;

-- Step 6: Test that RLS is working
-- This should return 0 if user is not authenticated or doesn't own any data
SELECT COUNT(*) FROM expense_reports;
SELECT COUNT(*) FROM expense_items;
