-- ========================================
-- MIGRATION 008: Fix RLS for Clerk (non-UUID) user IDs
-- ========================================
--
-- PROBLEM: All RLS policies use auth.uid()::text which internally does:
--   (current_setting('request.jwt.claims')::jsonb->>'sub')::uuid
-- Clerk user IDs like "user_35T4RzvioX6965EpjIWGo0gFMfs" are NOT valid UUIDs,
-- so auth.uid() throws: "invalid input syntax for type uuid"
--
-- FIX: Replace auth.uid()::text with (auth.jwt()->>'sub') everywhere.
-- This reads the "sub" claim as raw text — no UUID cast.
--
-- TABLES AFFECTED: user_profiles, expense_reports, expense_items, workspaces
--
-- RUN: Execute in Supabase SQL Editor (Dashboard → SQL Editor)

BEGIN;

-- ========================================
-- 1. USER_PROFILES
-- ========================================

DROP POLICY IF EXISTS "user_profiles_select" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow all operations on user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "Enable all access for user_profiles" ON user_profiles;

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_profiles_select"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (user_id = (auth.jwt()->>'sub'));

CREATE POLICY "user_profiles_insert"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

CREATE POLICY "user_profiles_update"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- No DELETE policy — profiles can only be deleted via service role (admin).

-- ========================================
-- 2. EXPENSE_REPORTS
-- ========================================

DROP POLICY IF EXISTS "expense_reports_select" ON expense_reports;
DROP POLICY IF EXISTS "expense_reports_insert" ON expense_reports;
DROP POLICY IF EXISTS "expense_reports_update" ON expense_reports;
DROP POLICY IF EXISTS "expense_reports_delete" ON expense_reports;
DROP POLICY IF EXISTS "Users can insert their own reports" ON expense_reports;
DROP POLICY IF EXISTS "Users can view their own reports" ON expense_reports;
DROP POLICY IF EXISTS "Users can update their own reports" ON expense_reports;
DROP POLICY IF EXISTS "Users can delete their own reports" ON expense_reports;
DROP POLICY IF EXISTS "Allow all operations on expense_reports" ON expense_reports;
DROP POLICY IF EXISTS "Enable all access for expense_reports" ON expense_reports;

ALTER TABLE expense_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expense_reports_select"
  ON expense_reports FOR SELECT
  TO authenticated
  USING (user_id = (auth.jwt()->>'sub'));

CREATE POLICY "expense_reports_insert"
  ON expense_reports FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

CREATE POLICY "expense_reports_update"
  ON expense_reports FOR UPDATE
  TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

CREATE POLICY "expense_reports_delete"
  ON expense_reports FOR DELETE
  TO authenticated
  USING (user_id = (auth.jwt()->>'sub'));

-- ========================================
-- 3. EXPENSE_ITEMS (via report ownership)
-- ========================================

DROP POLICY IF EXISTS "expense_items_select" ON expense_items;
DROP POLICY IF EXISTS "expense_items_insert" ON expense_items;
DROP POLICY IF EXISTS "expense_items_update" ON expense_items;
DROP POLICY IF EXISTS "expense_items_delete" ON expense_items;
DROP POLICY IF EXISTS "Users can view items through reports" ON expense_items;
DROP POLICY IF EXISTS "Users can insert items through reports" ON expense_items;
DROP POLICY IF EXISTS "Users can update items through reports" ON expense_items;
DROP POLICY IF EXISTS "Users can delete items through reports" ON expense_items;
DROP POLICY IF EXISTS "Allow all operations on expense_items" ON expense_items;
DROP POLICY IF EXISTS "Enable all access for expense_items" ON expense_items;

ALTER TABLE expense_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expense_items_select"
  ON expense_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM expense_reports
      WHERE expense_reports.id = expense_items.report_id
      AND expense_reports.user_id = (auth.jwt()->>'sub')
    )
  );

CREATE POLICY "expense_items_insert"
  ON expense_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM expense_reports
      WHERE expense_reports.id = expense_items.report_id
      AND expense_reports.user_id = (auth.jwt()->>'sub')
    )
  );

CREATE POLICY "expense_items_update"
  ON expense_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM expense_reports
      WHERE expense_reports.id = expense_items.report_id
      AND expense_reports.user_id = (auth.jwt()->>'sub')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM expense_reports
      WHERE expense_reports.id = expense_items.report_id
      AND expense_reports.user_id = (auth.jwt()->>'sub')
    )
  );

CREATE POLICY "expense_items_delete"
  ON expense_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM expense_reports
      WHERE expense_reports.id = expense_items.report_id
      AND expense_reports.user_id = (auth.jwt()->>'sub')
    )
  );

-- ========================================
-- 4. WORKSPACES
-- ========================================

DROP POLICY IF EXISTS "workspaces_select" ON workspaces;
DROP POLICY IF EXISTS "workspaces_insert" ON workspaces;
DROP POLICY IF EXISTS "workspaces_update" ON workspaces;
DROP POLICY IF EXISTS "workspaces_delete" ON workspaces;
DROP POLICY IF EXISTS "Users can view their own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can create their own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can update their own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can delete their own workspaces" ON workspaces;

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspaces_select"
  ON workspaces FOR SELECT
  TO authenticated
  USING (user_id = (auth.jwt()->>'sub'));

CREATE POLICY "workspaces_insert"
  ON workspaces FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

CREATE POLICY "workspaces_update"
  ON workspaces FOR UPDATE
  TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

CREATE POLICY "workspaces_delete"
  ON workspaces FOR DELETE
  TO authenticated
  USING (user_id = (auth.jwt()->>'sub'));

-- ========================================
-- 5. RAW_RECEIPTS (uses user_email, not user_id)
-- ========================================
-- raw_receipts uses email-based RLS. Update to also use jwt sub where possible.
-- Keep email-based for now since the table uses user_email column.

DO $$ BEGIN
  -- Drop existing
  DROP POLICY IF EXISTS "raw_receipts_select" ON raw_receipts;
  DROP POLICY IF EXISTS "raw_receipts_insert" ON raw_receipts;
  DROP POLICY IF EXISTS "raw_receipts_update" ON raw_receipts;
  DROP POLICY IF EXISTS "raw_receipts_delete" ON raw_receipts;
  DROP POLICY IF EXISTS "Allow all operations on raw_receipts" ON raw_receipts;

  ALTER TABLE raw_receipts ENABLE ROW LEVEL SECURITY;

  EXECUTE 'CREATE POLICY "raw_receipts_select" ON raw_receipts FOR SELECT TO authenticated USING (user_email = (auth.jwt()->>''email''))';
  EXECUTE 'CREATE POLICY "raw_receipts_insert" ON raw_receipts FOR INSERT TO authenticated WITH CHECK (user_email = (auth.jwt()->>''email''))';
  EXECUTE 'CREATE POLICY "raw_receipts_update" ON raw_receipts FOR UPDATE TO authenticated USING (user_email = (auth.jwt()->>''email'')) WITH CHECK (user_email = (auth.jwt()->>''email''))';
  EXECUTE 'CREATE POLICY "raw_receipts_delete" ON raw_receipts FOR DELETE TO authenticated USING (user_email = (auth.jwt()->>''email''))';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ========================================
-- 6. VERIFICATION (run after to confirm)
-- ========================================

SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('user_profiles', 'expense_reports', 'expense_items', 'workspaces', 'raw_receipts')
ORDER BY tablename, policyname;

COMMIT;
