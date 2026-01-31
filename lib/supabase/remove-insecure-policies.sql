-- ========================================
-- REMOVE INSECURE POLICIES - RUN THIS NOW
-- ========================================

-- Drop the insecure "Allow all operations" policies that are still active
DROP POLICY IF EXISTS "Allow all operations on expense_reports" ON expense_reports;
DROP POLICY IF EXISTS "Allow all operations on expense_items" ON expense_items;

-- Verify they're gone
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename IN ('expense_reports', 'expense_items')
ORDER BY tablename, policyname;

-- Should only show the "Users can..." policies now, NOT "Allow all operations"
