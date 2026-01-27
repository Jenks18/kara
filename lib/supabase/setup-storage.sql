-- ==========================================
-- SUPABASE STORAGE CONFIGURATION
-- Run this in Supabase SQL Editor
-- ==========================================

-- Create storage bucket for receipts
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipt-images',
  'receipt-images',
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

-- ==========================================
-- STORAGE POLICIES (Row Level Security)
-- ==========================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated profile picture uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update own profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete own profile pictures" ON storage.objects;

-- Allow authenticated users to upload receipts
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'receipt-images' AND
  (storage.foldername(name))[1] = 'receipts'
);

-- Allow public read access to receipts
CREATE POLICY "Allow public read" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'receipt-images');

-- Allow users to delete their own receipts
CREATE POLICY "Allow users to delete own receipts" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'receipt-images' AND
  owner = auth.uid()
);

-- Allow authenticated users to upload profile pictures
CREATE POLICY "Allow authenticated profile picture uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'profile-pictures'
);

-- Allow public read access to profile pictures
CREATE POLICY "Allow public read profile pictures" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'profile-pictures');

-- Allow users to update their own profile pictures
CREATE POLICY "Allow users to update own profile pictures" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'profile-pictures' AND
  owner = auth.uid()
);

-- Allow users to delete their own profile pictures
CREATE POLICY "Allow users to delete own profile pictures" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'profile-pictures' AND
  owner = auth.uid()
);

-- ==========================================
-- VERIFY SETUP
-- ==========================================

-- Check buckets exist
SELECT * FROM storage.buckets WHERE id IN ('receipt-images', 'profile-pictures');

-- Check policies
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

-- ==========================================
-- USAGE EXAMPLES
-- ==========================================

/*
Upload from client:
  const { data, error } = await supabase.storage
    .from('receipt-images')
    .upload(`receipts/${Date.now()}.jpg`, file);

Get public URL:
  const { data } = supabase.storage
    .from('receipt-images')
    .getPublicUrl('receipts/123.jpg');

Delete file:
  await supabase.storage
    .from('receipt-images')
    .remove(['receipts/123.jpg']);
*/
