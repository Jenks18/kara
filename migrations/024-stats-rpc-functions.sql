-- ==========================================
-- SERVER-SIDE STATS AGGREGATION FUNCTIONS
-- Run in Supabase SQL Editor
-- ==========================================
-- These RPCs run inside Postgres so PostgREST row limits
-- don't silently truncate results.

-- 1) Sum of all expense_items amounts for the calling user
CREATE OR REPLACE FUNCTION get_user_total_amount()
RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(SUM(ei.amount), 0)
  FROM expense_items ei
  JOIN expense_reports er ON er.id = ei.report_id
  WHERE er.user_id = (auth.jwt()->>'sub');
$$;

-- 2) Sum of expense_items for a given month window
CREATE OR REPLACE FUNCTION get_user_month_total(start_date timestamptz, end_date timestamptz)
RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(SUM(ei.amount), 0)
  FROM expense_items ei
  JOIN expense_reports er ON er.id = ei.report_id
  WHERE er.user_id = (auth.jwt()->>'sub')
    AND COALESCE(ei.transaction_date::timestamptz, ei.created_at) >= start_date
    AND COALESCE(ei.transaction_date::timestamptz, ei.created_at) < end_date;
$$;

-- 3) Count of expense_items for a given month window
CREATE OR REPLACE FUNCTION get_user_month_count(start_date timestamptz, end_date timestamptz)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(*)
  FROM expense_items ei
  JOIN expense_reports er ON er.id = ei.report_id
  WHERE er.user_id = (auth.jwt()->>'sub')
    AND COALESCE(ei.transaction_date::timestamptz, ei.created_at) >= start_date
    AND COALESCE(ei.transaction_date::timestamptz, ei.created_at) < end_date;
$$;

-- Grant execute to authenticated role
GRANT EXECUTE ON FUNCTION get_user_total_amount() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_month_total(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_month_count(timestamptz, timestamptz) TO authenticated;
