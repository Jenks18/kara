-- Apply all pending migrations to Supabase
-- Run this in Supabase SQL Editor

-- ============================================================
-- Migration 001: Add Multi-Tenant Support (Clerk Integration)
-- ============================================================

-- 1. Add user_id column to expense_reports
ALTER TABLE expense_reports 
ADD COLUMN IF NOT EXISTS user_id TEXT;

-- 2. Set default value for existing rows
UPDATE expense_reports 
SET user_id = 'legacy-user' 
WHERE user_id IS NULL;

-- 3. Make user_id NOT NULL after setting defaults
ALTER TABLE expense_reports 
ALTER COLUMN user_id SET NOT NULL;

-- 4. Add index for user_id queries
CREATE INDEX IF NOT EXISTS idx_expense_reports_user_id ON expense_reports(user_id);

-- 5. Add index for queries by user and date
CREATE INDEX IF NOT EXISTS idx_expense_reports_user_created ON expense_reports(user_id, created_at DESC);

-- 6. Enable RLS on expense_reports if not already enabled
ALTER TABLE expense_reports ENABLE ROW LEVEL SECURITY;

-- 7. Drop ALL policies if they exist (including old and new)
DROP POLICY IF EXISTS "Enable all access for expense_reports" ON expense_reports;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON expense_reports;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON expense_reports;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON expense_reports;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON expense_reports;
DROP POLICY IF EXISTS "Allow all for development - insert" ON expense_reports;
DROP POLICY IF EXISTS "Allow all for development - select" ON expense_reports;
DROP POLICY IF EXISTS "Allow all for development - update" ON expense_reports;
DROP POLICY IF EXISTS "Allow all for development - delete" ON expense_reports;

-- 8. Create permissive policies for development (allow all operations)
CREATE POLICY "Allow all for development - insert"
ON expense_reports FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow all for development - select"
ON expense_reports FOR SELECT
USING (true);

CREATE POLICY "Allow all for development - update"
ON expense_reports FOR UPDATE
USING (true);

CREATE POLICY "Allow all for development - delete"
ON expense_reports FOR DELETE
USING (true);

-- 9. Enable RLS on expense_items if not already enabled
ALTER TABLE expense_items ENABLE ROW LEVEL SECURITY;

-- 10. Drop ALL policies if they exist on expense_items (including old and new)
DROP POLICY IF EXISTS "Enable all access for expense_items" ON expense_items;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON expense_items;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON expense_items;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON expense_items;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON expense_items;
DROP POLICY IF EXISTS "Allow all for development - insert" ON expense_items;
DROP POLICY IF EXISTS "Allow all for development - select" ON expense_items;
DROP POLICY IF EXISTS "Allow all for development - update" ON expense_items;
DROP POLICY IF EXISTS "Allow all for development - delete" ON expense_items;

-- 11. Create permissive policies for expense_items (allow all operations)
CREATE POLICY "Allow all for development - insert"
ON expense_items FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow all for development - select"
ON expense_items FOR SELECT
USING (true);

CREATE POLICY "Allow all for development - update"
ON expense_items FOR UPDATE
USING (true);

CREATE POLICY "Allow all for development - delete"
ON expense_items FOR DELETE
USING (true);

-- ============================================================
-- Migration 002: Add Workspaces Support (if needed)
-- ============================================================

-- Add workspace_id column to expense_reports (optional for future)
ALTER TABLE expense_reports 
ADD COLUMN IF NOT EXISTS workspace_id UUID;

-- Create index for workspace queries
CREATE INDEX IF NOT EXISTS idx_expense_reports_workspace_id ON expense_reports(workspace_id);

-- ============================================================
-- Migration 003: Fix Storage Bucket Policies
-- ============================================================

-- Create receipts bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types, avif_autodetection)
VALUES (
  'receipts',
  'receipts',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
  false
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
  avif_autodetection = false;

-- Drop old storage policies
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

-- Create permissive storage policies (development mode)
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
-- Verification Queries
-- ============================================================

-- Check that all columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'expense_reports' 
ORDER BY ordinal_position;

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename IN ('expense_reports', 'expense_items')
ORDER BY tablename, policyname;

-- Check storage bucket
SELECT id, name, public, file_size_limit 
FROM storage.buckets 
WHERE id = 'receipts';

-- Check storage policies
SELECT policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
ORDER BY policyname;

-- Test file access (check if any files exist)
SELECT name, bucket_id, created_at 
FROM storage.objects 
WHERE bucket_id = 'receipts' 
ORDER BY created_at DESC 
LIMIT 5;

-- Success message
SELECT '✅ All migrations applied successfully!' as status;
SELECT 'Now test: Upload a receipt and check if it displays' as next_step;
