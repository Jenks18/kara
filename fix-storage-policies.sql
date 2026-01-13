-- Fix Storage RLS Policies for Receipts Bucket
-- Run this in Supabase SQL Editor AFTER running apply-migrations.sql

-- ============================================================
-- Storage Bucket Configuration
-- ============================================================

-- Create receipts bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  true,  -- Make bucket public so images can be viewed
  10485760,  -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- ============================================================
-- Storage Policies (Allow All for Development)
-- ============================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public uploads to receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes from receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "receipts_insert" ON storage.objects;
DROP POLICY IF EXISTS "receipts_select" ON storage.objects;
DROP POLICY IF EXISTS "receipts_update" ON storage.objects;
DROP POLICY IF EXISTS "receipts_delete" ON storage.objects;

-- Create permissive policies for receipts bucket (development mode)
CREATE POLICY "receipts_insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "receipts_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'receipts');

CREATE POLICY "receipts_update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'receipts');

CREATE POLICY "receipts_delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'receipts');

-- ============================================================
-- Verification
-- ============================================================

-- Check bucket exists
SELECT id, name, public, file_size_limit 
FROM storage.buckets 
WHERE id = 'receipts';

-- Check storage policies
SELECT policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
ORDER BY policyname;

-- Success message
SELECT '✅ Storage policies configured successfully!' as status;
