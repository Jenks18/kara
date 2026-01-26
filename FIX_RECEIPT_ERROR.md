# Fix Receipt Upload Error & Clerk Warnings

## 1. Apply Database Migration (CRITICAL - Fixes Receipt Upload)

### Via Supabase Dashboard (Recommended)

1. Open: https://supabase.com/dashboard/project/bkypfuyiknytkuhxtduc/sql/new

2. Copy the SQL from: `migrations/003-link-raw-receipts-to-expense-items.sql`

3. Paste it into the SQL Editor and click "Run"

**Or run directly from file:**
```bash
psql postgresql://postgres:[password]@db.bkypfuyiknytkuhxtduc.supabase.co:5432/postgres \
  -f migrations/003-link-raw-receipts-to-expense-items.sql
```

**This fixes the error:** `"Could not find the 'raw_receipt_id' column of 'expense_items' in the schema cache"`

---

## 2. Update Clerk Environment Variables (Fixes Deprecation Warnings)

### Update Vercel Environment Variables

Remove the old deprecated variables and add new ones:

#### Remove These (Deprecated):
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL`

#### Add These (New):
- `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` = `/`
- `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` = `/`

### Steps in Vercel Dashboard:

1. Go to: https://vercel.com/jenks18s-projects/kara/settings/environment-variables

2. Find and delete:
   - `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`
   - `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL`

3. Add new variables (all environments: Development, Preview, Production):
   - Name: `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`, Value: `/`
   - Name: `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL`, Value: `/`

4. Redeploy your application

---

## What This Fixes

### Database Error (Critical):
```
Failed to create expense item: { 
  code: 'PGRST204', 
  message: "Could not find the 'raw_receipt_id' column of 'expense_items' in the schema cache" 
}
```
✅ Fixed by applying migration 003

### Clerk Warnings:
```
Clerk: Clerk has been loaded with development keys
Clerk: The prop "afterSignInUrl" is deprecated
```
✅ Fixed by updating to new environment variable names
⚠️ Development keys warning is normal for localhost - ignored in production

---

## Test After Fixes

1. Upload a receipt in production
2. Check that both tables get populated:
   - `raw_receipts` (all scraped data)
   - `expense_items` (clean UI data with `raw_receipt_id` link)
3. Verify no more Clerk deprecation warnings in console
