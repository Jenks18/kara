-- ==============================================================
-- Migration 022: Consolidate duplicate workspace SELECT RLS policies
-- ==============================================================
-- Problem:
--   Migrations 013 and 014 left two coexisting SELECT policies on workspaces:
--
--   1. "Users can view their workspaces" (created by 013)
--      USING (user_id = (auth.jwt()->>'sub') OR is_workspace_member(id))
--
--   2. "Users can view workspaces they are members of" (created by 014)
--      USING (EXISTS (SELECT 1 FROM workspace_members wm WHERE ...))
--
--   Migration 014 tried to DROP "Users can view their own workspaces" (the name
--   used before 013 renamed it), so the DROP was a no-op and both policies
--   survived. They OR together causing redundancy and the inline EXISTS in
--   policy 2 bypasses the SECURITY DEFINER function, risking recursion.
--
-- Fix:
--   Drop both policies and create one clean unified policy that uses the
--   existing is_workspace_member() SECURITY DEFINER function throughout.
-- ==============================================================

BEGIN;

-- Drop both conflicting SELECT policies
DROP POLICY IF EXISTS "Users can view their workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON workspaces;

-- Single, unified SELECT policy using the SECURITY DEFINER helper
-- (is_workspace_member bypasses RLS to avoid recursion)
CREATE POLICY "Users can view their workspaces"
  ON workspaces FOR SELECT
  TO authenticated
  USING (
    user_id = (auth.jwt()->>'sub')
    OR is_workspace_member(id)
  );

COMMIT;

SELECT 'RLS consolidated — single clean SELECT policy on workspaces' AS status;
