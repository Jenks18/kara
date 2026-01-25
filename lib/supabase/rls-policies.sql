-- ========================================
-- PRODUCTION RLS POLICIES WITH CLERK JWT
-- ========================================
-- These policies automatically filter by authenticated user
-- No manual filtering needed in application code!
--
-- SETUP REQUIRED:
-- 1. In Clerk Dashboard → JWT Templates → Create "supabase" template
-- 2. Add claims: {"user_id": "{{user.id}}", "email": "{{user.primary_email_address}}"}
-- 3. In Supabase Dashboard → Authentication → Providers → Enable JWT
-- 4. Set JWT Secret to Clerk's JWKS URL

-- Drop existing policies
DROP POLICY IF EXISTS "Enable all access for expense_reports" ON expense_reports;
DROP POLICY IF EXISTS "Enable all access for expense_items" ON expense_items;
DROP POLICY IF EXISTS "Service role can access expense_reports" ON expense_reports;
DROP POLICY IF EXISTS "Service role can access expense_items" ON expense_items;

-- ========================================
-- EXPENSE_REPORTS RLS POLICIES
-- ========================================

-- Users can only read their own expense reports
CREATE POLICY "Users can view own expense_reports"
  ON expense_reports
  FOR SELECT
  TO authenticated
  USING (
    user_email = (auth.jwt()->>'email')::text
  );

-- Users can only insert their own expense reports
CREATE POLICY "Users can create own expense_reports"
  ON expense_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_email = (auth.jwt()->>'email')::text
  );

-- Users can only update their own expense reports
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

-- Users can only delete their own expense reports
CREATE POLICY "Users can delete own expense_reports"
  ON expense_reports
  FOR DELETE
  TO authenticated
  USING (
    user_email = (auth.jwt()->>'email')::text
  );

-- ========================================
-- EXPENSE_ITEMS RLS POLICIES
-- ========================================

-- Users can only view expense items from their own reports
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

-- Users can only insert expense items into their own reports
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

-- Users can only update expense items in their own reports
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

-- Users can only delete expense items from their own reports
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

-- ========================================
-- VERIFICATION
-- ========================================

-- List all policies
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('expense_reports', 'expense_items')
ORDER BY tablename, policyname;

COMMIT;
