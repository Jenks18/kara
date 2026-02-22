-- ==============================================================
-- Migration 029: Recreate stats RPC functions as SECURITY INVOKER
-- ==============================================================
-- Problem:
--   Migration 024 created get_user_month_total, get_user_month_count, and
--   get_user_total_amount as SECURITY DEFINER.  In that mode the functions
--   execute as the OWNER (postgres), which bypasses RLS entirely and relies
--   solely on the explicit `WHERE er.user_id = (auth.jwt()->>'sub')` clause
--   for data isolation.
--
--   This works, but:
--     1) If `auth.jwt()` ever returns NULL (e.g. misconfigured search_path),
--        the WHERE clause silently matches nothing → stats return 0 with no
--        error, making the bug invisible.
--     2) SECURITY DEFINER without an explicit `SET search_path` is a known
--        search-path-injection vector flagged by Supabase's linter.
--
-- Fix:
--   Recreate the functions as SECURITY INVOKER (the default).  The queries
--   now run under the calling role ('authenticated') so Postgres RLS
--   policies on expense_items and expense_reports provide a second layer
--   of data isolation automatically.  The explicit user_id WHERE clause is
--   kept for query-plan efficiency (pushes the filter into the index scan).
--
--   Also adds `SET search_path = ''` for defense-in-depth.
-- ==============================================================

BEGIN;

-- 1) Sum of all expense_items amounts for the calling user (all time)
CREATE OR REPLACE FUNCTION get_user_total_amount()
RETURNS numeric
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(SUM(ei.amount), 0)
  FROM public.expense_items ei
  JOIN public.expense_reports er ON er.id = ei.report_id
  WHERE er.user_id = (auth.jwt()->>'sub');
$$;

-- 2) Sum of expense_items for a date window
CREATE OR REPLACE FUNCTION get_user_month_total(start_date timestamptz, end_date timestamptz)
RETURNS numeric
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(SUM(ei.amount), 0)
  FROM public.expense_items ei
  JOIN public.expense_reports er ON er.id = ei.report_id
  WHERE er.user_id = (auth.jwt()->>'sub')
    AND COALESCE(ei.transaction_date::timestamptz, ei.created_at) >= start_date
    AND COALESCE(ei.transaction_date::timestamptz, ei.created_at) < end_date;
$$;

-- 3) Count of expense_items for a date window
CREATE OR REPLACE FUNCTION get_user_month_count(start_date timestamptz, end_date timestamptz)
RETURNS bigint
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = ''
AS $$
  SELECT COUNT(*)
  FROM public.expense_items ei
  JOIN public.expense_reports er ON er.id = ei.report_id
  WHERE er.user_id = (auth.jwt()->>'sub')
    AND COALESCE(ei.transaction_date::timestamptz, ei.created_at) >= start_date
    AND COALESCE(ei.transaction_date::timestamptz, ei.created_at) < end_date;
$$;

-- Re-grant execute to authenticated role (CREATE OR REPLACE preserves grants
-- but being explicit costs nothing and is defensive).
GRANT EXECUTE ON FUNCTION get_user_total_amount() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_month_total(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_month_count(timestamptz, timestamptz) TO authenticated;

COMMIT;

SELECT 'Migration 029 complete — stats RPCs upgraded to SECURITY INVOKER' AS status;
