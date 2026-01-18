-- QUICK FIX: Add user_id column and enable permissive access
-- Copy this ENTIRE file and run in Supabase SQL Editor

-- Add user_id column
ALTER TABLE expense_reports ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Set default for existing rows
UPDATE expense_reports SET user_id = 'legacy-user' WHERE user_id IS NULL;

-- Make it required
ALTER TABLE expense_reports ALTER COLUMN user_id SET NOT NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_expense_reports_user_id ON expense_reports(user_id);

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Enable all access for expense_reports" ON expense_reports;
DROP POLICY IF EXISTS "Users can insert their own reports" ON expense_reports;
DROP POLICY IF EXISTS "Users can view their own reports" ON expense_reports;
DROP POLICY IF EXISTS "Users can update their own reports" ON expense_reports;
DROP POLICY IF EXISTS "Users can delete their own reports" ON expense_reports;

DROP POLICY IF EXISTS "Enable all access for expense_items" ON expense_items;
DROP POLICY IF EXISTS "Users can insert their own items" ON expense_items;
DROP POLICY IF EXISTS "Users can view their own items" ON expense_items;
DROP POLICY IF EXISTS "Users can update their own items" ON expense_items;
DROP POLICY IF EXISTS "Users can delete their own items" ON expense_items;

-- Create permissive policies (allow everything for development)
CREATE POLICY "dev_all_insert" ON expense_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "dev_all_select" ON expense_reports FOR SELECT USING (true);
CREATE POLICY "dev_all_update" ON expense_reports FOR UPDATE USING (true);
CREATE POLICY "dev_all_delete" ON expense_reports FOR DELETE USING (true);

CREATE POLICY "dev_all_insert" ON expense_items FOR INSERT WITH CHECK (true);
CREATE POLICY "dev_all_select" ON expense_items FOR SELECT USING (true);
CREATE POLICY "dev_all_update" ON expense_items FOR UPDATE USING (true);
CREATE POLICY "dev_all_delete" ON expense_items FOR DELETE USING (true);

-- Add storage bucket and policies
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('receipts', 'receipts', true, 10485760, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "receipts_insert" ON storage.objects;
DROP POLICY IF EXISTS "receipts_select" ON storage.objects;
DROP POLICY IF EXISTS "receipts_update" ON storage.objects;
DROP POLICY IF EXISTS "receipts_delete" ON storage.objects;

CREATE POLICY "receipts_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receipts');
CREATE POLICY "receipts_select" ON storage.objects FOR SELECT USING (bucket_id = 'receipts');
CREATE POLICY "receipts_update" ON storage.objects FOR UPDATE USING (bucket_id = 'receipts');
CREATE POLICY "receipts_delete" ON storage.objects FOR DELETE USING (bucket_id = 'receipts');

-- Verify it worked
SELECT 'SUCCESS: user_id column added and storage configured' as status;
SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'expense_reports' AND column_name = 'user_id';
