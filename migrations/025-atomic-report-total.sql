-- ==========================================
-- Migration 025: Atomic report total update
-- Run in Supabase SQL Editor
-- ==========================================
-- Replaces the read-then-write pattern for updating report totals,
-- which had a race condition on concurrent batch uploads.

CREATE OR REPLACE FUNCTION update_report_total(report_id_param uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE expense_reports
  SET total_amount = (
    SELECT COALESCE(SUM(amount), 0)
    FROM expense_items
    WHERE report_id = report_id_param
  )
  WHERE id = report_id_param;
$$;

GRANT EXECUTE ON FUNCTION update_report_total(uuid) TO authenticated;
