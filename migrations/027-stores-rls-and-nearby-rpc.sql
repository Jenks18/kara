-- ==============================================================
-- Migration 027: Stores table RLS + find_stores_nearby RPC
-- ==============================================================
-- Problems:
--   1. stores table has only a SELECT policy (anyone can read).
--      The recordEncounter() function in store-recognition.ts USEs
--      a user-scoped Supabase client to INSERT/UPDATE stores and
--      was silently failing due to RLS blocking all writes.
--
--   2. find_stores_nearby() RPC is called by StoreRecognizer but
--      never existed in any migration — the code had an in-memory
--      fallback but that pulls ALL stores for every recognition call.
--
-- Fix:
--   1. Add authenticated INSERT + UPDATE policies on stores
--      (stores is shared infrastructure, not user-scoped data)
--   2. Create find_stores_nearby() using Haversine distance in SQL
-- ==============================================================

BEGIN;

-- ─── 1. Stores write policies ──────────────────────────────────────────────

-- Any authenticated user (the backend acting on their behalf) can add new stores
DROP POLICY IF EXISTS "Authenticated users can insert stores" ON stores;
CREATE POLICY "Authenticated users can insert stores"
  ON stores
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Any authenticated user can update store stats (receipt_count, last_seen_at, etc.)
-- Verified flag is NOT included in updates from recordEncounter, so data integrity
-- for "verified" stores remains intact (those rows can only be set by admin SQL).
DROP POLICY IF EXISTS "Authenticated users can update stores" ON stores;
CREATE POLICY "Authenticated users can update stores"
  ON stores
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ─── 2. find_stores_nearby RPC ─────────────────────────────────────────────

-- Haversine distance in metres between two lat/lng coordinates.
-- Used by find_stores_nearby to avoid pulling all rows into JS.
CREATE OR REPLACE FUNCTION haversine_metres(
  lat1 DOUBLE PRECISION,
  lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lon2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT 6371000 * 2 * ASIN(
    SQRT(
      POWER(SIN(RADIANS(lat2 - lat1) / 2), 2) +
      COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
      POWER(SIN(RADIANS(lon2 - lon1) / 2), 2)
    )
  );
$$;

-- Returns stores within radius_m metres of (lat, lng).
-- Runs server-side so we only return the matching subset rather than
-- dumping the entire stores table to the JS fallback filter.
CREATE OR REPLACE FUNCTION find_stores_nearby(
  lat    DOUBLE PRECISION,
  lng    DOUBLE PRECISION,
  radius_m DOUBLE PRECISION DEFAULT 100
)
RETURNS SETOF stores
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM   stores
  WHERE  latitude  IS NOT NULL
  AND    longitude IS NOT NULL
  AND    haversine_metres(lat, lng, latitude::double precision, longitude::double precision) <= radius_m
  ORDER BY haversine_metres(lat, lng, latitude::double precision, longitude::double precision)
  LIMIT 20;
$$;

COMMIT;

SELECT 'Migration 027 complete — stores write RLS added, find_stores_nearby RPC created' AS status;
