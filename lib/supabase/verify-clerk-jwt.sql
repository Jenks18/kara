-- ========================================
-- VERIFY CLERK JWT INTEGRATION
-- ========================================
-- Run this to check if Clerk JWT is working properly

-- 1. Check if auth.jwt() function works
SELECT auth.jwt();

-- 2. Check if email is being extracted from JWT
SELECT (auth.jwt()->>'email')::text as user_email;

-- 3. Check current user's role
SELECT auth.role();

-- 4. Test RLS by counting records (should only show your data)
SELECT 
  'expense_reports' as table_name,
  COUNT(*) as my_records,
  (SELECT COUNT(*) FROM expense_reports) as visible_records
FROM expense_reports
WHERE user_email = (auth.jwt()->>'email')::text

UNION ALL

SELECT 
  'expense_items' as table_name,
  COUNT(*) as my_records,
  (SELECT COUNT(*) FROM expense_items er
   JOIN expense_reports rep ON er.report_id = rep.id
   WHERE rep.user_email = (auth.jwt()->>'email')::text) as visible_records
FROM expense_items;

-- Expected result: my_records should equal visible_records
-- If visible_records > my_records, RLS is not working!
