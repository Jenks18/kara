-- Fix existing receipts bucket to be truly public
-- Run this in Supabase SQL Editor

-- Update bucket to be public
UPDATE storage.buckets 
SET public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
WHERE id = 'receipts';

-- Verify bucket is public
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'receipts';

-- List uploaded files to verify they exist
SELECT name, bucket_id, owner, created_at, updated_at, 
       last_accessed_at, metadata->>'size' as size_bytes
FROM storage.objects 
WHERE bucket_id = 'receipts' 
ORDER BY created_at DESC 
LIMIT 10;

-- Success
SELECT '✅ Bucket is now public. Images should display!' as status;
