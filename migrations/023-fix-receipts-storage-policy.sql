-- ==============================================================
-- Migration 023: Fix receipts storage bucket RLS for mobile
-- ==============================================================
-- Problem:
--   The receipts bucket's INSERT policy checks:
--     (storage.foldername(name))[1] = (auth.jwt()->>'email')::text
--
--   This works for web (Clerk session JWT always has email), but mobile
--   uploads from the Android/iOS app use a backend-minted HS256 JWT whose
--   email claim may differ from the folder name if the email contains
--   characters that get normalised differently, or if a user signs in
--   via a provider where email is not guaranteed in the JWT.
--
--   Additionally, the upload path is:
--     {userEmail}/{timestamp}-{filename}
--   but we want to also allow:
--     {userId}/{timestamp}-{filename}
--   as a fallback for mobile clients.
--
-- Fix:
--   Replace the receipts INSERT/DELETE policies:
--   1. Allow if folder matches email  (existing web behaviour)
--   2. Allow if folder matches sub    (userId — mobile path option)
--   3. Keep SELECT public             (receipts are public images)
--
-- NOTE: Run against your Supabase project via SQL Editor or supabase db push.
-- ==============================================================

BEGIN;

-- ── DROP old policies ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow authenticated uploads"      ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read"                ON storage.objects;

-- ── CREATE fixed policies ─────────────────────────────────────────────────

-- INSERT: allow if the top-level folder is the user's email OR their Clerk sub
CREATE POLICY "receipts_insert_mobile"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'receipts'
  AND (
    (storage.foldername(name))[1] = (auth.jwt()->>'email')::text
    OR
    (storage.foldername(name))[1] = (auth.jwt()->>'sub')::text
  )
);

-- SELECT: receipts bucket is public (images are served directly)
CREATE POLICY "receipts_select_public"
ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'receipts');

-- DELETE: mirror insert — own folder by email or sub
CREATE POLICY "receipts_delete_own"
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'receipts'
  AND (
    (storage.foldername(name))[1] = (auth.jwt()->>'email')::text
    OR
    (storage.foldername(name))[1] = (auth.jwt()->>'sub')::text
  )
);

-- UPDATE: same pattern
CREATE POLICY "receipts_update_own"
ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'receipts'
  AND (
    (storage.foldername(name))[1] = (auth.jwt()->>'email')::text
    OR
    (storage.foldername(name))[1] = (auth.jwt()->>'sub')::text
  )
)
WITH CHECK (
  bucket_id = 'receipts'
  AND (
    (storage.foldername(name))[1] = (auth.jwt()->>'email')::text
    OR
    (storage.foldername(name))[1] = (auth.jwt()->>'sub')::text
  )
);

COMMIT;

SELECT 'Migration 023 applied: receipts storage policies updated for mobile JWT compatibility' AS status;
