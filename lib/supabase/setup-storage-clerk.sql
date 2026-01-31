-- ==========================================
-- SUPABASE STORAGE CONFIGURATION (CLERK AUTH)
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
-- STORAGE POLICIES (Clerk Authentication)
-- ==========================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated profile picture uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update own profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete own profile pictures" ON storage.objects;

-- ==========================================
-- RECEIPT IMAGES POLICIES
-- ==========================================

-- Allow authenticated users to upload receipts
-- Clerk users are identified by email in JWT
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'receipt-images' AND
  (storage.foldername(name))[1] = 'receipts' AND
  (auth.jwt()->>'email') IS NOT NULL
);

-- Allow public read access to receipts
CREATE POLICY "Allow public read" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'receipt-images');

-- Allow users to delete receipts from their own folders
-- Folder structure: receipts/{user_email}/{filename}
CREATE POLICY "Allow users to delete own receipts" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'receipt-images' AND
  (storage.foldername(name))[1] = 'receipts' AND
  (storage.foldername(name))[2] = (auth.jwt()->>'email')::text
);

-- ==========================================
-- PROFILE PICTURES POLICIES
-- ==========================================

-- Allow authenticated users to upload profile pictures
-- Folder structure: profile/{user_email}/{filename}
CREATE POLICY "Allow authenticated profile picture uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'profile-pictures' AND
  (storage.foldername(name))[1] = 'profile' AND
  (storage.foldername(name))[2] = (auth.jwt()->>'email')::text
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
  (storage.foldername(name))[1] = 'profile' AND
  (storage.foldername(name))[2] = (auth.jwt()->>'email')::text
);

-- Allow users to delete their own profile pictures
CREATE POLICY "Allow users to delete own profile pictures" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'profile-pictures' AND
  (storage.foldername(name))[1] = 'profile' AND
  (storage.foldername(name))[2] = (auth.jwt()->>'email')::text
);

-- ==========================================
-- VERIFY SETUP
-- ==========================================

-- Check buckets exist
SELECT * FROM storage.buckets WHERE id IN ('receipt-images', 'profile-pictures');

-- Check policies
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY policyname;

-- Test JWT email (should show your email, not null)
SELECT (auth.jwt()->>'email')::text as current_user_email;

-- ==========================================
-- USAGE EXAMPLES
-- ==========================================

/*
Upload receipt (store in user's folder):
  const userEmail = user.primaryEmailAddress?.emailAddress;
  const fileName = `receipts/${userEmail}/${Date.now()}.jpg`;
  
  const { data, error } = await supabase.storage
    .from('receipt-images')
    .upload(fileName, file);

Upload profile picture:
  const userEmail = user.primaryEmailAddress?.emailAddress;
  const fileName = `profile/${userEmail}/avatar.jpg`;
  
  const { data, error } = await supabase.storage
    .from('profile-pictures')
    .upload(fileName, file, { upsert: true });

Get public URL:
  const { data } = supabase.storage
    .from('receipt-images')
    .getPublicUrl(`receipts/${userEmail}/123.jpg`);

Delete file:
  await supabase.storage
    .from('receipt-images')
    .remove([`receipts/${userEmail}/123.jpg`]);
*/

-- ==========================================
-- IMPORTANT NOTES
-- ==========================================

/*
1. FOLDER STRUCTURE IS CRITICAL:
   - Receipts: receipts/{user_email}/{filename}
   - Profiles: profile/{user_email}/{filename}
   
2. CLERK JWT MUST INCLUDE EMAIL:
   - Go to Clerk Dashboard → JWT Templates → "supabase"
   - Add claim: {"email": "{{user.primary_email_address}}"}
   
3. POLICIES CHECK FOLDER PATH:
   - (storage.foldername(name))[2] extracts the user email from path
   - Compares it to (auth.jwt()->>'email') from Clerk JWT
   
4. WITHOUT PROPER JWT:
   - Uploads will fail (email is null)
   - Users could access each other's files
   - Storage security is compromised
*/
