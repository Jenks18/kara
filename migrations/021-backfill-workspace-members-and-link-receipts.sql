-- ==============================================================
-- Migration 021: Backfill workspace_members + link receipts to workspaces
-- ==============================================================
-- Fixes two data issues:
--
-- 1. Some workspaces exist without a workspace_members row for the owner.
--    This means RLS hides the workspace from the user who created it.
--    We backfill missing workspace_members rows for all workspace owners.
--
-- 2. Many expense_reports have workspace_id = NULL because the web upload
--    route hardcoded workspace_name='Default Workspace' without setting
--    workspace_id. We link orphaned reports to their owner's workspace.
--
-- 3. Standardize workspace_name on expense_reports to match the actual
--    workspace name (fixes "Default Workspace" → actual name).
-- ==============================================================

BEGIN;

-- ──────────────────────────────────────────────────────────────
-- 1. Backfill missing workspace_members for workspace owners
-- ──────────────────────────────────────────────────────────────
INSERT INTO workspace_members (workspace_id, user_id, role, invited_by, permissions, status)
SELECT
  w.id,
  w.owner_id,
  'admin',
  w.owner_id,
  '{"can_view": true, "can_edit": true, "can_delete": true, "can_invite": true, "can_manage_members": true}'::jsonb,
  'active'
FROM workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM workspace_members wm
  WHERE wm.workspace_id = w.id
  AND wm.user_id = w.owner_id
)
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- ──────────────────────────────────────────────────────────────
-- 2. Link orphaned expense_reports to their owner's first workspace
-- ──────────────────────────────────────────────────────────────
UPDATE expense_reports er
SET
  workspace_id = (
    SELECT w.id
    FROM workspaces w
    WHERE w.owner_id = er.user_id
    AND w.is_active = true
    ORDER BY w.created_at ASC
    LIMIT 1
  ),
  workspace_name = (
    SELECT w.name
    FROM workspaces w
    WHERE w.owner_id = er.user_id
    AND w.is_active = true
    ORDER BY w.created_at ASC
    LIMIT 1
  )
WHERE er.workspace_id IS NULL
AND EXISTS (
  SELECT 1 FROM workspaces w
  WHERE w.owner_id = er.user_id
  AND w.is_active = true
);

-- ──────────────────────────────────────────────────────────────
-- 3. Fix "Default Workspace" name on reports that now have a workspace_id
-- ──────────────────────────────────────────────────────────────
UPDATE expense_reports er
SET workspace_name = w.name
FROM workspaces w
WHERE er.workspace_id = w.id
AND er.workspace_name = 'Default Workspace';

-- ──────────────────────────────────────────────────────────────
-- 4. Update member counts for all workspaces
-- ──────────────────────────────────────────────────────────────
UPDATE workspaces w
SET member_count = (
  SELECT COUNT(*)
  FROM workspace_members wm
  WHERE wm.workspace_id = w.id
  AND wm.status = 'active'
);

COMMIT;

SELECT 'Backfill complete — workspace_members populated, receipts linked to workspaces!' as status;
