-- ========================================
-- MIGRATION 007: Add RLS policies to user_profiles
-- ========================================
--
-- PROBLEM: user_profiles table had no RLS policies, meaning any
-- authenticated user could read/write any profile if they bypassed
-- the application layer. Security must be enforced at the DB level.
--
-- This migration adds proper RLS policies so that:
--   - Users can only SELECT/UPDATE their own profile (user_id = auth.uid())
--   - Users can INSERT a profile for themselves (for first-time setup)
--   - No user can DELETE profiles (only admins via service role)
--
-- The webapp and Android app both use Clerk-minted Supabase JWTs where
-- the "sub" claim = Clerk user ID, which auth.uid() reads.
--
-- RUN: Execute in Supabase SQL Editor (Dashboard → SQL Editor)

BEGIN;

-- ========================================
-- 1. DROP ANY EXISTING POLICIES
-- ========================================

DROP POLICY IF EXISTS "user_profiles_select" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete" ON user_profiles;
DROP POLICY IF EXISTS "Allow all operations on user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "Enable all access for user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;

-- ========================================
-- 2. ENABLE RLS
-- ========================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 3. POLICIES: user_id = auth.uid()::text
-- ========================================

-- Users can read their own profile
CREATE POLICY "user_profiles_select"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

-- Users can create their own profile (first-time setup)
CREATE POLICY "user_profiles_insert"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

-- Users can update their own profile
CREATE POLICY "user_profiles_update"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

-- No DELETE policy — profiles can only be deleted via service role (admin)

-- ========================================
-- 4. VERIFICATION
-- ========================================

SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;

COMMIT;
