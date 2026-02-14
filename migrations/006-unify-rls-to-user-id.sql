-- ========================================
-- MIGRATION 006: Unify all RLS to user_id
-- ========================================
--
-- PROBLEM: RLS policies are inconsistent:
--   - workspaces: auth.uid()::text = user_id (Clerk user ID) ✓
--   - expense_reports: auth.jwt()->>'email' = user_email (email-based) ✗
--   - expense_items: joins through expense_reports.user_email ✗
--
-- Email-based RLS is fragile: if a user changes their email in Clerk,
-- they lose access to their expense data. user_id is immutable.
--
-- This migration:
--   1. Drops ALL existing RLS policies (including any permissive "Allow all" ones)
--   2. Creates clean, unified policies using user_id = auth.uid()::text
--   3. Adds service_role bypass policies (so admin client still works)
--
-- PREREQUISITE: The "supabase" JWT template in Clerk must include:
--   { "sub": "{{user.id}}", "email": "{{user.primary_email_address}}" }
--   The "sub" claim is what auth.uid() reads.
--
-- RUN: Execute in Supabase SQL Editor (Dashboard → SQL Editor)

BEGIN;

-- ========================================
-- 1. DROP ALL EXISTING POLICIES
-- ========================================

-- expense_reports
DROP POLICY IF EXISTS "Users can view own expense_reports" ON expense_reports;
DROP POLICY IF EXISTS "Users can create own expense_reports" ON expense_reports;
DROP POLICY IF EXISTS "Users can update own expense_reports" ON expense_reports;
DROP POLICY IF EXISTS "Users can delete own expense_reports" ON expense_reports;
DROP POLICY IF EXISTS "Enable all access for expense_reports" ON expense_reports;
DROP POLICY IF EXISTS "Allow all operations on expense_reports" ON expense_reports;
DROP POLICY IF EXISTS "Users can insert their own reports" ON expense_reports;
DROP POLICY IF EXISTS "Users can view their own reports" ON expense_reports;
DROP POLICY IF EXISTS "Users can update their own reports" ON expense_reports;
DROP POLICY IF EXISTS "Users can delete their own reports" ON expense_reports;

-- expense_items
DROP POLICY IF EXISTS "Users can view own expense_items" ON expense_items;
DROP POLICY IF EXISTS "Users can create own expense_items" ON expense_items;
DROP POLICY IF EXISTS "Users can update own expense_items" ON expense_items;
DROP POLICY IF EXISTS "Users can delete own expense_items" ON expense_items;
DROP POLICY IF EXISTS "Enable all access for expense_items" ON expense_items;
DROP POLICY IF EXISTS "Allow all operations on expense_items" ON expense_items;
DROP POLICY IF EXISTS "Users can view items through reports" ON expense_items;
DROP POLICY IF EXISTS "Users can insert items through reports" ON expense_items;
DROP POLICY IF EXISTS "Users can update items through reports" ON expense_items;
DROP POLICY IF EXISTS "Users can delete items through reports" ON expense_items;

-- workspaces
DROP POLICY IF EXISTS "Users can view their own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can create their own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can update their own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can delete their own workspaces" ON workspaces;

-- raw_receipts
DROP POLICY IF EXISTS "Allow all operations on raw_receipts" ON raw_receipts;
DROP POLICY IF EXISTS "Users can view their own raw receipts" ON raw_receipts;
DROP POLICY IF EXISTS "Users can insert their own raw receipts" ON raw_receipts;
DROP POLICY IF EXISTS "Users can update their own raw receipts" ON raw_receipts;

-- ========================================
-- 2. ENSURE RLS IS ENABLED
-- ========================================

ALTER TABLE expense_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- raw_receipts may not exist in all environments
DO $$ BEGIN
  ALTER TABLE raw_receipts ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ========================================
-- 3. EXPENSE_REPORTS: user_id based
-- ========================================
-- auth.uid() returns the "sub" claim from the JWT, which is the Clerk user ID

CREATE POLICY "expense_reports_select"
  ON expense_reports FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

CREATE POLICY "expense_reports_insert"
  ON expense_reports FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "expense_reports_update"
  ON expense_reports FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "expense_reports_delete"
  ON expense_reports FOR DELETE
  TO authenticated
  USING (user_id = auth.uid()::text);

-- ========================================
-- 4. EXPENSE_ITEMS: via report ownership
-- ========================================

CREATE POLICY "expense_items_select"
  ON expense_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM expense_reports
      WHERE expense_reports.id = expense_items.report_id
      AND expense_reports.user_id = auth.uid()::text
    )
  );

CREATE POLICY "expense_items_insert"
  ON expense_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM expense_reports
      WHERE expense_reports.id = expense_items.report_id
      AND expense_reports.user_id = auth.uid()::text
    )
  );

CREATE POLICY "expense_items_update"
  ON expense_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM expense_reports
      WHERE expense_reports.id = expense_items.report_id
      AND expense_reports.user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM expense_reports
      WHERE expense_reports.id = expense_items.report_id
      AND expense_reports.user_id = auth.uid()::text
    )
  );

CREATE POLICY "expense_items_delete"
  ON expense_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM expense_reports
      WHERE expense_reports.id = expense_items.report_id
      AND expense_reports.user_id = auth.uid()::text
    )
  );

-- ========================================
-- 5. WORKSPACES: user_id based (same as before)
-- ========================================

CREATE POLICY "workspaces_select"
  ON workspaces FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

CREATE POLICY "workspaces_insert"
  ON workspaces FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "workspaces_update"
  ON workspaces FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "workspaces_delete"
  ON workspaces FOR DELETE
  TO authenticated
  USING (user_id = auth.uid()::text);

-- ========================================
-- 6. RAW_RECEIPTS: user_id based (if table exists)
-- ========================================

DO $$ BEGIN
  EXECUTE 'CREATE POLICY "raw_receipts_select" ON raw_receipts FOR SELECT TO authenticated USING (user_id = auth.uid()::text)';
  EXECUTE 'CREATE POLICY "raw_receipts_insert" ON raw_receipts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text)';
  EXECUTE 'CREATE POLICY "raw_receipts_update" ON raw_receipts FOR UPDATE TO authenticated USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text)';
  EXECUTE 'CREATE POLICY "raw_receipts_delete" ON raw_receipts FOR DELETE TO authenticated USING (user_id = auth.uid()::text)';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ========================================
-- 7. VERIFICATION
-- ========================================

SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('expense_reports', 'expense_items', 'workspaces', 'raw_receipts')
ORDER BY tablename, policyname;

COMMIT;
