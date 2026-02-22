-- ==============================================================
-- Migration 026: Allow workspace members to SELECT shared data
-- ==============================================================
-- Problem:
--   Workspace members can see the workspace (via is_workspace_member in 022)
--   but cannot SELECT expense_reports or expense_items belonging to that
--   workspace. This blocks any collaboration features.
--
-- Fix:
--   Extend the SELECT policies on expense_reports and expense_items to
--   also allow active workspace members to view workspace data.
--   Uses the existing is_workspace_member() SECURITY DEFINER function
--   to avoid RLS recursion.
-- ==============================================================

BEGIN;

-- ─── expense_reports ────────────────────────────────────────────
-- Drop the old owner-only SELECT policy
DROP POLICY IF EXISTS "expense_reports_select" ON expense_reports;
DROP POLICY IF EXISTS "Users can view their own reports" ON expense_reports;

-- New SELECT policy: owner OR workspace member
CREATE POLICY "expense_reports_select"
  ON expense_reports FOR SELECT
  TO authenticated
  USING (
    user_id = (auth.jwt()->>'sub')
    OR (
      workspace_id IS NOT NULL
      AND is_workspace_member(workspace_id)
    )
  );

-- ─── expense_items ──────────────────────────────────────────────
-- Drop the old owner-only SELECT policy (joins through reports)
DROP POLICY IF EXISTS "expense_items_select" ON expense_items;
DROP POLICY IF EXISTS "Users can view items through reports" ON expense_items;

-- New SELECT policy: owner's items OR workspace member can view items
-- in reports belonging to the same workspace
CREATE POLICY "expense_items_select"
  ON expense_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM expense_reports er
      WHERE er.id = expense_items.report_id
      AND (
        er.user_id = (auth.jwt()->>'sub')
        OR (
          er.workspace_id IS NOT NULL
          AND is_workspace_member(er.workspace_id)
        )
      )
    )
  );

COMMIT;

SELECT 'Migration 026 complete — workspace members can now view shared reports & items' AS status;
