-- ==============================================================
-- Migration 031: Storage RLS policies for profile-pictures bucket
-- ==============================================================
-- Problem:
--   The upload-avatar API route was using SUPABASE_SERVICE_ROLE_KEY to
--   bypass RLS entirely. Migration 017 created policies for a bucket
--   called 'profile-avatars', but the actual bucket is 'profile-pictures'.
--
-- Fix:
--   Create proper RLS policies for the 'profile-pictures' bucket that:
--   1. Scope uploads to the user's own folder ({userId}/*)
--   2. Allow public read access (profile pictures are public images)
--   3. Use auth.jwt()->>'sub' (Clerk user ID) for folder ownership
--
-- PREREQUISITE:
--   The 'profile-pictures' bucket must exist in Supabase Storage.
--   Create it via Dashboard → Storage → New bucket:
--     Name: profile-pictures
--     Public: true
--     File size limit: 5 MB
--     Allowed MIME types: image/jpeg, image/jpg, image/png, image/webp
--
-- ==============================================================

BEGIN;

-- ── DROP stale policies from migration 017 (wrong bucket name) ────────────
DROP POLICY IF EXISTS "Users can upload profile avatars"   ON storage.objects;
DROP POLICY IF EXISTS "Profile avatars are publicly viewable" ON storage.objects;
DROP POLICY IF EXISTS "Users can update profile avatars"   ON storage.objects;
DROP POLICY IF EXISTS "Users can delete profile avatars"   ON storage.objects;

-- ── INSERT: users can upload only to their own folder ─────────────────────
CREATE POLICY "profile_pictures_insert_own"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'profile-pictures'
  AND (storage.foldername(name))[1] = (auth.jwt()->>'sub')::text
);

-- ── SELECT: profile pictures are publicly viewable ────────────────────────
CREATE POLICY "profile_pictures_select_public"
ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'profile-pictures');

-- ── UPDATE: users can update files in their own folder ────────────────────
CREATE POLICY "profile_pictures_update_own"
ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'profile-pictures'
  AND (storage.foldername(name))[1] = (auth.jwt()->>'sub')::text
)
WITH CHECK (
  bucket_id = 'profile-pictures'
  AND (storage.foldername(name))[1] = (auth.jwt()->>'sub')::text
);

-- ── DELETE: users can delete files in their own folder ────────────────────
CREATE POLICY "profile_pictures_delete_own"
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'profile-pictures'
  AND (storage.foldername(name))[1] = (auth.jwt()->>'sub')::text
);

COMMIT;

SELECT 'Migration 031 applied: profile-pictures storage policies (folder-scoped, RLS enforced)' AS status;
