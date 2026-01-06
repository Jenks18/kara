-- Disable RLS on storage.objects for receipts bucket
-- This allows public uploads/reads for receipt images

-- First, create policies for the receipts bucket
CREATE POLICY IF NOT EXISTS "Public uploads to receipts bucket"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'receipts');

CREATE POLICY IF NOT EXISTS "Public reads from receipts bucket"  
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'receipts');

CREATE POLICY IF NOT EXISTS "Public updates in receipts bucket"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'receipts')
WITH CHECK (bucket_id = 'receipts');

CREATE POLICY IF NOT EXISTS "Public deletes from receipts bucket"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'receipts');
