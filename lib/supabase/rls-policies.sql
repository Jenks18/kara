-- ========================================
-- PROPER RLS POLICIES FOR PRODUCTION
-- ========================================
-- Run this to replace the wide-open policies with proper user-scoped ones

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Enable all access for expense_reports" ON expense_reports;
DROP POLICY IF EXISTS "Enable all access for expense_items" ON expense_items;

-- ========================================
-- EXPENSE_REPORTS POLICIES
-- ========================================

-- Users can only read their own expense reports
CREATE POLICY "Users can view own expense_reports"
  ON expense_reports
  FOR SELECT
  USING (user_email = current_setting('request.jwt.claims', true)::json->>'email');

-- Users can only insert their own expense reports
CREATE POLICY "Users can create own expense_reports"
  ON expense_reports
  FOR INSERT
  WITH CHECK (user_email = current_setting('request.jwt.claims', true)::json->>'email');

-- Users can only update their own expense reports
CREATE POLICY "Users can update own expense_reports"
  ON expense_reports
  FOR UPDATE
  USING (user_email = current_setting('request.jwt.claims', true)::json->>'email')
  WITH CHECK (user_email = current_setting('request.jwt.claims', true)::json->>'email');

-- Users can only delete their own expense reports
CREATE POLICY "Users can delete own expense_reports"
  ON expense_reports
  FOR DELETE
  USING (user_email = current_setting('request.jwt.claims', true)::json->>'email');

-- ========================================
-- EXPENSE_ITEMS POLICIES
-- ========================================

-- Users can only view expense items from their own reports
CREATE POLICY "Users can view own expense_items"
  ON expense_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM expense_reports
      WHERE expense_reports.id = expense_items.report_id
      AND expense_reports.user_email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

-- Users can only insert expense items into their own reports
CREATE POLICY "Users can create own expense_items"
  ON expense_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM expense_reports
      WHERE expense_reports.id = expense_items.report_id
      AND expense_reports.user_email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

-- Users can only update expense items in their own reports
CREATE POLICY "Users can update own expense_items"
  ON expense_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM expense_reports
      WHERE expense_reports.id = expense_items.report_id
      AND expense_reports.user_email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM expense_reports
      WHERE expense_reports.id = expense_items.report_id
      AND expense_reports.user_email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

-- Users can only delete expense items from their own reports
CREATE POLICY "Users can delete own expense_items"
  ON expense_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM expense_reports
      WHERE expense_reports.id = expense_items.report_id
      AND expense_reports.user_email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

-- ========================================
-- VERIFICATION
-- ========================================

-- List all policies
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('expense_reports', 'expense_items')
ORDER BY tablename, policyname;

COMMIT;
