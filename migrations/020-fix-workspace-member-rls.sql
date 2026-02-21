-- ==============================================================
-- Migration 020: Fix workspace_members RLS for workspace creation
-- ==============================================================
-- Problem: When creating a workspace, the auto_add_workspace_owner()
-- trigger tries to INSERT into workspace_members, but the INSERT
-- policy requires the user to ALREADY be an admin member — classic
-- chicken-and-egg. The trigger function runs as the authenticated
-- role (not superuser), so RLS blocks it.
--
-- Fix: Make the trigger SECURITY DEFINER so it bypasses RLS
-- (it's a trusted server-side operation), and add a fallback
-- policy allowing workspace owners to self-insert.
-- ==============================================================

BEGIN;

-- 1. Fix the trigger function to bypass RLS
CREATE OR REPLACE FUNCTION auto_add_workspace_owner()
RETURNS TRIGGER
SECURITY DEFINER          -- Bypasses RLS — trusted server-side operation
SET search_path = public  -- Security best practice with SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO workspace_members (workspace_id, user_id, role, invited_by, permissions, status)
  VALUES (
    NEW.id,
    NEW.owner_id,
    'admin',
    NEW.owner_id,
    '{"can_view": true, "can_edit": true, "can_delete": true, "can_invite": true, "can_manage_members": true}'::jsonb,
    'active'
  )
  ON CONFLICT (workspace_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Also add a backup INSERT policy so workspace owners can add
--    themselves even outside the trigger (belt and suspenders).
DROP POLICY IF EXISTS "Owners can add themselves as first member" ON workspace_members;

CREATE POLICY "Owners can add themselves as first member"
ON workspace_members FOR INSERT
TO authenticated
WITH CHECK (
  -- The inserting user must be inserting THEMSELVES
  user_id = (auth.jwt()->>'sub')
  -- AND the workspace must be owned by them
  AND EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = workspace_members.workspace_id
    AND w.owner_id = (auth.jwt()->>'sub')
  )
);

-- 3. Also fix the member count update function to be SECURITY DEFINER
--    (it updates workspaces table which may hit RLS)
CREATE OR REPLACE FUNCTION update_workspace_member_count()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE workspaces
  SET member_count = (
    SELECT COUNT(*) 
    FROM workspace_members 
    WHERE workspace_id = COALESCE(NEW.workspace_id, OLD.workspace_id)
    AND status = 'active'
  )
  WHERE id = COALESCE(NEW.workspace_id, OLD.workspace_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 4. Fix the activity logging function to be SECURITY DEFINER
CREATE OR REPLACE FUNCTION log_workspace_activity()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO workspace_activity (workspace_id, user_id, activity_type, description, target_user_id, metadata)
    VALUES (
      NEW.workspace_id,
      COALESCE(NEW.invited_by, NEW.user_id),
      'member_joined',
      'New member joined the workspace',
      NEW.user_id,
      jsonb_build_object('role', NEW.role)
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO workspace_activity (workspace_id, user_id, activity_type, description, target_user_id, metadata)
    VALUES (
      NEW.workspace_id,
      COALESCE(auth.jwt()->>'sub', NEW.user_id),
      'role_changed',
      format('Member role changed from %s to %s', OLD.role, NEW.role),
      NEW.user_id,
      jsonb_build_object('old_role', OLD.role, 'new_role', NEW.role)
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO workspace_activity (workspace_id, user_id, activity_type, description, target_user_id)
    VALUES (
      OLD.workspace_id,
      COALESCE(auth.jwt()->>'sub', OLD.user_id),
      'member_removed',
      'Member removed from workspace',
      OLD.user_id
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

COMMIT;

SELECT 'Workspace RLS fix applied — workspace creation should work now!' as status;
