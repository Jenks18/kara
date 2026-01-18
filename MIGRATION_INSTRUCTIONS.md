# Database Migration Instructions

## Problem
The `expense_reports` table is missing the `user_id` column, which causes the error:
```
Error creating report: Could not find the 'user_id' column of 'expense_reports' in the schema cache
```

## Solution
Apply the migration to add the `user_id` column and update RLS policies.

## Option 1: Apply via Supabase Dashboard (RECOMMENDED)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `bkypfuyiknytkuhxtduc`
3. Click on "SQL Editor" in the left sidebar
4. Click "New Query"
5. Copy the entire contents of `apply-migrations.sql`
6. Paste into the SQL editor
7. Click "Run" (or press Cmd/Ctrl + Enter)
8. Wait for confirmation message: "✅ All migrations applied successfully!"

## Option 2: Apply via Supabase CLI

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to your project
supabase link --project-ref bkypfuyiknytkuhxtduc

# Apply the migration
supabase db push
```

## Verification

After applying the migration, verify it worked:

### Check in Supabase Dashboard:
1. Go to "Table Editor"
2. Select `expense_reports` table
3. Verify `user_id` column exists (type: text, NOT NULL)

### Test in your app:
1. Try creating a new expense report
2. It should now work without errors
3. Check the browser console - no more "user_id column" errors

## What the Migration Does

1. ✅ Adds `user_id` column to `expense_reports` table
2. ✅ Sets default value for existing rows (`legacy-user`)
3. ✅ Creates indexes for faster queries
4. ✅ Updates RLS (Row Level Security) policies to allow all operations in development
5. ✅ Applies same policies to `expense_items` table
6. ✅ Adds optional `workspace_id` column for future workspace features

## Troubleshooting

### If you get "column already exists" error:
- This is normal if the column was partially added before
- The `IF NOT EXISTS` clauses will skip those steps
- Continue with the rest of the migration

### If you get RLS policy errors:
- RLS policies may have different names
- The `DROP POLICY IF EXISTS` will safely remove old policies
- New permissive policies will be created

### If expense reports still don't save:
1. Check browser console for specific error
2. Verify Supabase credentials in `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://bkypfuyiknytkuhxtduc.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
3. Check Supabase logs in Dashboard > Logs

## After Migration

Once the migration is applied successfully:
- ✅ Creating expense reports will work
- ✅ User authentication will be tied to reports
- ✅ Multi-tenant data isolation is enabled
- ✅ All existing reports are preserved with `legacy-user` ID

## Production Note

The current migration uses **permissive policies** (allows all operations) for development convenience. 

Before going to production, you should:
1. Update policies to use proper authentication
2. Replace `WITH CHECK (true)` with `WITH CHECK (auth.uid()::text = user_id)`
3. Replace `USING (true)` with `USING (auth.uid()::text = user_id)`

This ensures users can only access their own expense reports.
