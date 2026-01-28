-- ==========================================
-- WORKSPACE AVATARS STORAGE BUCKET
-- Run this in Supabase SQL Editor
-- ==========================================

-- Create storage bucket for workspace avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'workspace-avatars',
  'workspace-avatars',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- STORAGE POLICIES (Row Level Security)
-- ==========================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated workspace avatar uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read workspace avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update workspace avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete workspace avatars" ON storage.objects;

-- Allow authenticated users to upload workspace avatars
CREATE POLICY "Allow authenticated workspace avatar uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'workspace-avatars'
);

-- Allow public read access to workspace avatars
CREATE POLICY "Allow public read workspace avatars" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'workspace-avatars');

-- Allow authenticated users to update workspace avatars
CREATE POLICY "Allow users to update workspace avatars" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'workspace-avatars')
WITH CHECK (bucket_id = 'workspace-avatars');

-- Allow authenticated users to delete workspace avatars
CREATE POLICY "Allow users to delete workspace avatars" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'workspace-avatars');

-- ==========================================
-- VERIFY SETUP
-- ==========================================

-- Check bucket exists
SELECT * FROM storage.buckets WHERE id = 'workspace-avatars';

-- Check policies
SELECT * 
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage' 
  AND policyname LIKE '%workspace avatar%';

-- ==========================================
-- USAGE EXAMPLES
-- ==========================================

/*
Upload workspace avatar from client:
  const { data, error } = await supabase.storage
    .from('workspace-avatars')
    .upload(`workspace-avatars/${workspaceId}-${Date.now()}.jpg`, file);

Get public URL:
  const { data } = supabase.storage
    .from('workspace-avatars')
    .getPublicUrl('workspace-avatars/abc123.jpg');

Delete old avatar:
  await supabase.storage
    .from('workspace-avatars')
    .remove(['workspace-avatars/old-avatar.jpg']);
*/
