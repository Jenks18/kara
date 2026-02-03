-- ==========================================
-- SUPABASE STORAGE CONFIGURATION
-- Run this in Supabase SQL Editor
-- ==========================================

-- Create storage bucket for receipts
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for profile pictures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-pictures',
  'profile-pictures',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for workspace avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'workspace-avatars',
  'workspace-avatars',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- STORAGE POLICIES (Row Level Security)
-- CLERK JWT COMPATIBLE - Uses email from JWT instead of auth.uid()
-- ==========================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated profile picture uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update own profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete own profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated workspace avatar uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read workspace avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update workspace avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete workspace avatars" ON storage.objects;

-- Remove insecure public policies (if they exist)
DROP POLICY IF EXISTS "receipts_insert" ON storage.objects;
DROP POLICY IF EXISTS "receipts_update" ON storage.objects;
DROP POLICY IF EXISTS "receipts_delete" ON storage.objects;
DROP POLICY IF EXISTS "receipts_select" ON storage.objects;

-- Allow authenticated users to upload receipts
-- Files should be uploaded to: receipts/{user-email}/{filename}
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = (auth.jwt()->>'email')::text
);

-- Allow public read access to receipts
CREATE POLICY "Allow public read" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'receipts');

-- Allow users to delete their own receipts
-- Checks that the file path contains their email
CREATE POLICY "Allow users to delete own receipts" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = (auth.jwt()->>'email')::text
);

-- Allow authenticated users to upload profile pictures
-- Files should be uploaded to: {user-email}/avatar.jpg
CREATE POLICY "Allow authenticated profile picture uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'profile-pictures' AND
  (storage.foldername(name))[1] = (auth.jwt()->>'email')::text
);

-- Allow public read access to profile pictures
CREATE POLICY "Allow public read profile pictures" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'profile-pictures');

-- Allow users to update their own profile pictures
-- Checks that the file path contains their email
CREATE POLICY "Allow users to update own profile pictures" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'profile-pictures' AND
  

-- ==========================================
-- WORKSPACE AVATARS POLICIES
-- ==========================================

-- Allow authenticated users to upload workspace avatars
CREATE POLICY "Allow authenticated workspace avatar uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'workspace-avatars');

-- Allow public read access to workspace avatars
CREATE POLICY "Allow public read workspace avatars" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'workspace-avatars');

-- Allow authenticated users to update workspace avatars
CREATE POLICY "Allow users to update workspace avatars" ON storage.object, 'workspace-avatars's
FOR UPDATE TO authenticated
USING (bucket_id = 'workspace-avatars')
WITH CHECK (bucket_id = 'workspace-avatars');

-- Allow authenticated users to delete workspace avatars
CREATE POLICY "Allow users to delete workspace avatars" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'workspace-avatars');(storage.foldername(name))[1] = (auth.jwt()->>'email')::text
);

-- Allow users to delete their own profile pictures
-- Checks that the file path contains their email
CREATE POLICY "Allow users to delete own profile pictures" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'profile-pictures' AND
  (storage.foldername(name))[1] = (auth.jwt()->>'email')::text
);

-- ==========================================
-- VERIFY SETUP
-- ==========================================

-- Check buckets exist
SELECT * FROM storage.buckets WHERE id IN ('receipts', 'profile-pictures');

-- Check policies
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

-- ==========================================
-- USAGE EXAMPLES (CLERK-COMPATIBLE)
-- ==========================================

/*
Upload receipt (with user email in path):
  const userEmail = user.primaryEmailAddress.emailAddress
  const { data, error } = await supabase.storage
    .from('receipts')
    .upload(`${userEmail}/${Date.now()}.jpg`, file);

Upload profile picture:
  const userEmail = user.primaryEmailAddress.emailAddress
  const { data, error } = await supabase.storage
    .from('profile-pictures')
    .upload(`${userEmail}/avatar.jpg`, file);

Get public URL:
  const { data } = supabase.storage
    .from('receipts')
    .getPublicUrl('user@example.com/123.jpg');

Delete file:
  await supabase.storage
    .from('receipts')
    .remove(['user@example.com/123.jpg']);
*/
