-- ==============================================================
-- Migration 028: Add HEIC/HEIF to receipts bucket allowed MIME types
-- ==============================================================
-- Problem:
--   The receipts bucket was created (setup-storage.sql / migration 017) with:
--     allowed_mime_types = ['image/jpeg','image/jpg','image/png','image/webp']
--
--   iOS devices capture photos in HEIC format by default. The application code
--   (orchestrator.ts + mobile upload routes) already accepts image/heic and
--   image/heif, but Supabase enforces bucket-level MIME filtering BEFORE RLS,
--   so HEIC uploads silently fail with HTTP 400 before any policy is evaluated.
--
-- Fix:
--   Expand the allowed_mime_types list on the receipts bucket to include HEIC
--   and HEIF. Profile-pictures and workspace-avatars are updated for parity
--   (iOS users may also want to upload HEIC avatars).
-- ==============================================================

BEGIN;

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif'
]
WHERE id = 'receipts';

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif'
]
WHERE id = 'profile-pictures';

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif'
]
WHERE id = 'workspace-avatars';

COMMIT;

SELECT
  id,
  allowed_mime_types
FROM storage.buckets
WHERE id IN ('receipts', 'profile-pictures', 'workspace-avatars')
ORDER BY id;
