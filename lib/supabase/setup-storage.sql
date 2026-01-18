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

-- ==========================================
-- STORAGE POLICIES (Row Level Security)
-- ==========================================

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

-- ==========================================
-- VERIFY SETUP
-- ==========================================

-- Check bucket exists
SELECT * FROM storage.buckets WHERE id = 'receipt-images';

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
