-- ========================================
-- REMOVE OLD DEVELOPMENT POLICIES
-- ========================================
-- Run this to remove permissive development policies
-- and rely ONLY on JWT-based RLS policies

-- Remove all development policies from expense_reports
DROP POLICY IF EXISTS "Allow all for development - delete" ON expense_reports;
DROP POLICY IF EXISTS "Allow all for development - insert" ON expense_reports;
DROP POLICY IF EXISTS "Allow all for development - select" ON expense_reports;
DROP POLICY IF EXISTS "Allow all for development - update" ON expense_reports;
DROP POLICY IF EXISTS "dev_all_delete" ON expense_reports;
DROP POLICY IF EXISTS "dev_all_insert" ON expense_reports;
DROP POLICY IF EXISTS "dev_all_select" ON expense_reports;
DROP POLICY IF EXISTS "dev_all_update" ON expense_reports;

-- Remove all development policies from expense_items
DROP POLICY IF EXISTS "Allow all for development - delete" ON expense_items;
DROP POLICY IF EXISTS "Allow all for development - insert" ON expense_items;
DROP POLICY IF EXISTS "Allow all for development - select" ON expense_items;
DROP POLICY IF EXISTS "Allow all for development - update" ON expense_items;
DROP POLICY IF EXISTS "dev_all_delete" ON expense_items;
DROP POLICY IF EXISTS "dev_all_insert" ON expense_items;
DROP POLICY IF EXISTS "dev_all_select" ON expense_items;
DROP POLICY IF EXISTS "dev_all_update" ON expense_items;

-- Verify only JWT policies remain
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('expense_reports', 'expense_items')
ORDER BY tablename, policyname;

COMMIT;
