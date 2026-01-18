# ✅ FINAL FIX - Run This Now

## What's Wrong

Your checker found:
- ✅ Database table `expense_reports` has `user_id` column (good!)
- ❌ Storage bucket `receipts` is missing
- ❌ Storage RLS policies are missing

This is why image uploads fail with "row-level security policy" error.

## 🎯 The Fix (60 seconds)

### Step 1: Open Supabase SQL Editor

Click this link (opens directly to SQL Editor):
https://supabase.com/dashboard/project/bkypfuyiknytkuhxtduc/sql/new

### Step 2: Copy the SQL

Open the file `apply-migrations.sql` in VS Code (it's already selected for you!)

Select all (Cmd+A or Ctrl+A) and copy (Cmd+C or Ctrl+C)

### Step 3: Paste and Run

1. Paste into the SQL Editor
2. Click the green **"RUN"** button
3. Wait 2-3 seconds

### Step 4: Check for Success

Scroll down in the SQL results. You should see:

```
✅ All migrations applied successfully!
```

Plus tables showing:
- expense_reports columns (including user_id)
- RLS policies for expense_reports and expense_items
- receipts bucket configuration
- Storage policies

### Step 5: Test

1. Go back to your app
2. Create new expense report
3. Add receipt from gallery
4. Save
5. Should work perfectly now! 🎉

## Verification

After running the migration, verify it worked:

```bash
node scripts/check-schema.mjs
```

Should show all green checkmarks ✅

## About the Warnings

**"Could not establish connection"** - This is just a browser extension trying to communicate. Totally harmless, you can ignore it!

To hide it:
- F12 → Console → Filter icon → "Hide extension messages"

Or just let it be - it doesn't affect anything.

## What This SQL Does

1. ✅ Creates `receipts` storage bucket
2. ✅ Sets bucket to public (so images load)
3. ✅ Sets 10MB file size limit
4. ✅ Allows image formats: JPEG, PNG, WebP
5. ✅ Creates 4 storage policies:
   - `receipts_insert` - allows uploads
   - `receipts_select` - allows viewing
   - `receipts_update` - allows editing
   - `receipts_delete` - allows deletion

All policies are permissive (allow all) for development ease.

## If It Still Doesn't Work

### 1. Hard Refresh Browser
- Chrome/Edge: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- This clears cached errors

### 2. Check Supabase Storage
- Go to Dashboard → Storage
- Should see "receipts" bucket
- Click it → Policies tab
- Should see 4 policies listed

### 3. Restart Dev Server
```bash
# Ctrl+C to stop
npm run dev
```

### 4. Check Console
- F12 → Console
- Look for actual errors (red text)
- Ignore warnings (yellow text)

---

## TL;DR

1. **Click:** https://supabase.com/dashboard/project/bkypfuyiknytkuhxtduc/sql/new
2. **Paste:** `apply-migrations.sql` (the file you have open)
3. **Run:** Green button
4. **See:** ✅ All migrations applied successfully!
5. **Test:** Create expense report with image
6. **Done!** 🚀

The storage bucket was missing - that's the whole problem. After this migration, everything will work!
