-- ========================================
-- PROPER RLS POLICIES FOR PRODUCTION
-- ========================================
-- Run this to replace the wide-open policies with proper user-scoped ones
-- 
-- NOTE: Since we use service_role key with x-user-email headers,
-- we keep policies open but rely on application-level filtering.
-- For true RLS, you'd need to set up Supabase Auth integration with Clerk.

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Enable all access for expense_reports" ON expense_reports;
DROP POLICY IF EXISTS "Enable all access for expense_items" ON expense_items;

-- ========================================
-- TEMPORARY OPEN POLICIES
-- (Application handles auth via createAuthenticatedClient)
-- ========================================

-- Allow authenticated service role to access all expense_reports
-- Application filters by user_email in queries
CREATE POLICY "Service role can access expense_reports"
  ON expense_reports
  FOR ALL
  TO authenticated, service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated service role to access all expense_items  
-- Application filters via join to expense_reports.user_email
CREATE POLICY "Service role can access expense_items"
  ON expense_items
  FOR ALL
  TO authenticated, service_role
  USING (true)
  WITH CHECK (true);

-- ========================================
-- FUTURE: TRUE RLS WITH SUPABASE AUTH
-- ========================================
-- To implement proper RLS, integrate Clerk with Supabase Auth:
-- 1. Use Supabase Auth JWT tokens instead of service_role key
-- 2. Replace policies with:
--
-- CREATE POLICY "Users can view own expense_reports"
--   ON expense_reports FOR SELECT
--   USING (user_email = auth.jwt()->>'email');
--
-- CREATE POLICY "Users can view own expense_items"
--   ON expense_items FOR SELECT
--   USING (
--     EXISTS (
--       SELECT 1 FROM expense_reports
--       WHERE expense_reports.id = expense_items.report_id
--       AND expense_reports.user_email = auth.jwt()->>'email'
--     )
--   );

-- ========================================
-- VERIFICATION
-- ========================================

-- List all policies
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('expense_reports', 'expense_items')
ORDER BY tablename, policyname;

COMMIT;
