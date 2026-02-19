-- Migration 010: Fix infinite recursion in workspace_members RLS policies
-- The SELECT policy on workspace_members references workspace_members itself,
-- causing PostgreSQL to enter infinite recursion when evaluating RLS.
-- Fix: Use a SECURITY DEFINER function that bypasses RLS to check membership.

-- 1. Create a SECURITY DEFINER function to check workspace membership
-- This function runs with owner privileges (bypasses RLS), breaking the recursion
CREATE OR REPLACE FUNCTION is_workspace_member(ws_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = ws_id
    AND user_id = (auth.jwt()->>'sub')
    AND status = 'active'
  );
$$;

-- 2. Create a helper to check if user is a workspace admin
CREATE OR REPLACE FUNCTION is_workspace_admin(ws_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = ws_id
    AND user_id = (auth.jwt()->>'sub')
    AND role = 'admin'
    AND status = 'active'
  );
$$;

-- 3. Drop the recursive policies on workspace_members
DROP POLICY IF EXISTS "Users can view workspace members if they are members" ON workspace_members;
DROP POLICY IF EXISTS "Admins can add workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Admins can update workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Admins can remove workspace members" ON workspace_members;

-- 4. Recreate non-recursive workspace_members policies using the SECURITY DEFINER functions
CREATE POLICY "Members can view fellow members"
  ON workspace_members FOR SELECT
  TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Admins can add members"
  ON workspace_members FOR INSERT
  TO authenticated
  WITH CHECK (is_workspace_admin(workspace_id));

CREATE POLICY "Admins can update members"
  ON workspace_members FOR UPDATE
  TO authenticated
  USING (is_workspace_admin(workspace_id));

CREATE POLICY "Admins can remove members"
  ON workspace_members FOR DELETE
  TO authenticated
  USING (is_workspace_admin(workspace_id));

-- 5. Fix workspaces SELECT policy too — it also references workspace_members
DROP POLICY IF EXISTS "Members can view their workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can view their own workspaces" ON workspaces;

CREATE POLICY "Users can view their workspaces"
  ON workspaces FOR SELECT
  TO authenticated
  USING (
    user_id = (auth.jwt()->>'sub')
    OR is_workspace_member(id)
  );

-- 6. Fix workspaces UPDATE/DELETE policies to use the function
DROP POLICY IF EXISTS "Admins can update workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can update their own workspaces" ON workspaces;

CREATE POLICY "Admins can update workspaces"
  ON workspaces FOR UPDATE
  TO authenticated
  USING (
    user_id = (auth.jwt()->>'sub')
    OR is_workspace_admin(id)
  );

DROP POLICY IF EXISTS "Admins can delete workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can delete their own workspaces" ON workspaces;

CREATE POLICY "Admins can delete workspaces"
  ON workspaces FOR DELETE
  TO authenticated
  USING (
    user_id = (auth.jwt()->>'sub')
    OR is_workspace_admin(id)
  );

-- Keep INSERT policy simple — users create their own workspaces
DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can create their own workspaces" ON workspaces;

CREATE POLICY "Users can create workspaces"
  ON workspaces FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (auth.jwt()->>'sub'));
