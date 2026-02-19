-- ============================================
-- MIGRATION 012: Create Storage Buckets
-- ============================================
-- Create required Supabase Storage buckets for file uploads

-- NOTE: Storage bucket creation must be done via Supabase Dashboard or API
-- This SQL sets up the storage policies assuming buckets already exist.
-- 
-- MANUAL STEPS REQUIRED:
-- 1. Go to Supabase Dashboard → Storage
-- 2. Create bucket: "workspace-avatars" (Public bucket)
-- 3. Create bucket: "profile-avatars" (Public bucket)
-- 4. Then run this SQL to set up the RLS policies

-- ========================================
-- workspace-avatars bucket policies
-- ========================================

-- Allow authenticated users to upload workspace avatars
CREATE POLICY "Users can upload workspace avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'workspace-avatars'
);

-- Allow anyone to view workspace avatars (public)
CREATE POLICY "Workspace avatars are publicly viewable"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'workspace-avatars'
);

-- Allow authenticated users to update their own uploads
CREATE POLICY "Users can update workspace avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'workspace-avatars'
);

-- Allow authenticated users to delete workspace avatars
CREATE POLICY "Users can delete workspace avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'workspace-avatars'
);

-- ========================================
-- profile-avatars bucket policies
-- ========================================

-- Allow authenticated users to upload profile avatars
CREATE POLICY "Users can upload profile avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-avatars'
);

-- Allow anyone to view profile avatars (public)
CREATE POLICY "Profile avatars are publicly viewable"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'profile-avatars'
);

-- Allow authenticated users to update their own profile avatars
CREATE POLICY "Users can update profile avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-avatars'
);

-- Allow authenticated users to delete profile avatars
CREATE POLICY "Users can delete profile avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-avatars'
);

-- Migration complete
SELECT 'Storage bucket policies created. Remember to create buckets in Supabase Dashboard first!' as status;
