-- ========================================
-- MIGRATION 007: Clean RLS policies on user_profiles
-- ========================================
--
-- Drops ALL existing policies (including duplicates from prior runs)
-- and creates exactly 3 clean policies:
--   SELECT, INSERT, UPDATE — all enforcing user_id = auth.uid()::text
--
-- No DELETE policy — profiles can only be deleted via service role (admin).
--
-- IMPORTANT: Re-run this if you see duplicate policies.
-- RUN: Execute in Supabase SQL Editor (Dashboard → SQL Editor)

BEGIN;

-- ========================================
-- 1. DROP ALL EXISTING POLICIES (every known name variant)
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

-- ========================================
-- 2. ENABLE RLS
-- ========================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 3. CREATE EXACTLY 3 POLICIES
-- ========================================

CREATE POLICY "user_profiles_select"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

CREATE POLICY "user_profiles_insert"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "user_profiles_update"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

-- ========================================
-- 4. VERIFICATION (should show exactly 3 rows)
-- ========================================

SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;

COMMIT;
