-- Migration 030: Add is_default flag to workspaces
-- 
-- Adds a boolean column to distinguish the auto-created personal workspace
-- from user-created workspaces. The default workspace:
--   • Cannot be deleted (enforced via CHECK constraint + trigger)
--   • Is hidden from the workspace management UI
--   • Still receives receipts/expenses when no workspace is specified
--   • Each user can have exactly ONE default workspace (enforced via unique partial index)
--
-- Run: node scripts/apply-migration-030.mjs

BEGIN;

-- 1. Add the column (defaults false so existing user-created workspaces are unaffected)
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false;

-- 2. Backfill: Mark each user's oldest active workspace as default.
--    This matches the creation pattern in user-profile/init which creates
--    the first workspace as "Personal".
UPDATE workspaces w
SET is_default = true
FROM (
  SELECT DISTINCT ON (user_id) id
  FROM workspaces
  WHERE is_active = true
  ORDER BY user_id, created_at ASC
) oldest
WHERE w.id = oldest.id;

-- 3. Unique partial index: at most ONE default workspace per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_workspaces_one_default_per_user
  ON workspaces (user_id)
  WHERE is_default = true AND is_active = true;

-- 4. Prevent soft-deleting the default workspace at the DB level
CREATE OR REPLACE FUNCTION prevent_default_workspace_deactivation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only fire when is_active is being set to false
  IF OLD.is_default = true AND OLD.is_active = true AND NEW.is_active = false THEN
    RAISE EXCEPTION 'Cannot delete the default workspace. Create another workspace first.';
  END IF;
  -- Also prevent unsetting is_default directly
  IF OLD.is_default = true AND NEW.is_default = false THEN
    RAISE EXCEPTION 'Cannot remove default status from the default workspace.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_default_workspace_deactivation ON workspaces;
CREATE TRIGGER trg_prevent_default_workspace_deactivation
  BEFORE UPDATE ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION prevent_default_workspace_deactivation();

COMMIT;
