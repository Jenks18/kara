# 🔧 Complete Fix: Database + Storage Issues

## Your Current Errors

1. ✅ **"Could not establish connection"** - This is harmless (browser extension warning)
2. ❌ **"new row violates row-level security policy"** - Storage upload blocked

## The Real Problem

Your Supabase Storage bucket for receipts doesn't have the right security policies, so image uploads are failing.

## ⚡ Quick Fix (Run This SQL)

### Option 1: Complete Fix (Recommended)

**Go to:** https://supabase.com/dashboard/project/bkypfuyiknytkuhxtduc/sql/new

**Copy & Paste:** The ENTIRE contents of `apply-migrations.sql` (it now includes storage fixes)

**Click:** RUN

You should see:
```
✅ All migrations applied successfully!
```

### Option 2: Just Fix Storage (If you already ran the first migration)

**Go to:** Same SQL Editor link above

**Copy & Paste:** The contents of `fix-storage-policies.sql`

**Click:** RUN

You should see:
```
✅ Storage policies configured successfully!
```

## What Gets Fixed

### Database Tables
- ✅ Adds `user_id` column to expense_reports
- ✅ Creates database indexes
- ✅ Updates table security policies

### Storage Bucket
- ✅ Creates `receipts` bucket (if doesn't exist)
- ✅ Makes bucket public (so you can view images)
- ✅ Sets 10MB file size limit
- ✅ Allows JPEG, PNG, WebP images
- ✅ Adds security policies to allow uploads

## About "Cannot establish connection" Warning

This warning is **harmless** and comes from browser extensions (like React DevTools) trying to communicate with the page. It doesn't affect your app.

### Why it happens:
- You have Chrome/Edge extensions installed
- They inject scripts into web pages
- Sometimes those scripts can't connect back to the extension
- This is a Chrome bug, not your app's bug

### To hide it (optional):
1. Open DevTools (F12)
2. Click the "Filter" icon in Console
3. Check "Hide extension messages"

Or just ignore it - it won't break anything!

## Verify Everything Works

### Method 1: Test in App
1. Go to your app
2. Create new expense report
3. Add receipt from gallery
4. Fill details and save
5. Should work now! ✅

### Method 2: Check Schema
```bash
node scripts/check-schema.mjs
```

Should show: `✅ Database schema is correct!`

### Method 3: Check in Supabase
**Table Editor:**
- expense_reports → should have `user_id` column

**Storage:**
- Storage → receipts bucket → should exist and be public

## Common Issues After Migration

### "Still getting RLS error"
- Make sure you ran the COMPLETE migration (apply-migrations.sql)
- Check Storage → receipts → Policies tab in Supabase
- Should see 4 policies: receipts_insert, receipts_select, receipts_update, receipts_delete

### "Image not showing"
- The bucket needs to be public
- Check Storage → receipts → Configuration
- "Public bucket" should be ON

### "400 Bad Request on upload"
- Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
- Check allowed MIME types include: image/jpeg, image/png
- Check file size under 10MB

## SQL Files Reference

| File | Purpose | When to Use |
|------|---------|-------------|
| `apply-migrations.sql` | Complete migration (database + storage) | **Use this first** |
| `fix-storage-policies.sql` | Just storage policies | If you already ran database migration |
| `fix-db-quick.sql` | Combined quick fix | Alternative to apply-migrations.sql |

## Still Not Working?

### 1. Check Supabase Logs
Dashboard → Logs → Look for errors

### 2. Check Browser Console
F12 → Console → Look for red errors (ignore yellow warnings)

### 3. Verify Environment
```bash
# Should show your Supabase URL
echo $NEXT_PUBLIC_SUPABASE_URL
```

### 4. Restart Everything
```bash
# Stop dev server (Ctrl+C)
npm run dev
# Hard refresh browser (Ctrl+Shift+R)
```

---

## TL;DR

1. **Go to:** https://supabase.com/dashboard/project/bkypfuyiknytkuhxtduc/sql/new
2. **Paste:** All of `apply-migrations.sql`
3. **Click:** RUN
4. **Ignore:** "Cannot establish connection" warnings (harmless!)
5. **Test:** Create expense report with receipt
6. **Success!** 🎉

The storage RLS policy was the real problem - now fixed!
