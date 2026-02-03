-- ==========================================
-- REMOVE INSECURE STORAGE POLICIES
-- Run this in Supabase SQL Editor IMMEDIATELY
-- ==========================================

-- These policies allow PUBLIC (unauthenticated) users to manipulate storage
-- They were likely created by an old setup script and are DANGEROUS

DROP POLICY IF EXISTS "receipts_insert" ON storage.objects;
DROP POLICY IF EXISTS "receipts_update" ON storage.objects;
DROP POLICY IF EXISTS "receipts_delete" ON storage.objects;

-- Keep receipts_select if you want public read access (usually fine for receipt images)
-- Or uncomment this line to remove it too:
-- DROP POLICY IF EXISTS "receipts_select" ON storage.objects;

-- ==========================================
-- VERIFY REMOVAL
-- ==========================================

-- Check remaining policies (should only see the Clerk-compatible ones)
SELECT 
  policyname,
  cmd,
  roles,
  CASE 
    WHEN roles::text LIKE '%public%' THEN '⚠️ PUBLIC'
    WHEN roles::text LIKE '%authenticated%' THEN '✅ AUTH'
    ELSE '❓ OTHER'
  END as security_level
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
ORDER BY cmd, policyname;
