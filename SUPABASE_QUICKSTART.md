# 🚀 Quick Supabase Setup (5 minutes)

## Step 1: Create Supabase Project

1. Go to **https://supabase.com** → Sign in/up
2. Click **"New Project"**
3. Fill in:
   - **Name**: Kara
   - **Database Password**: (SAVE THIS!)
   - **Region**: Choose closest to you
4. Click **"Create new project"**
5. ⏰ Wait 2-3 minutes for provisioning...

---

## Step 2: Get Your API Credentials

1. In your Supabase project, click **Settings** (⚙️ icon in sidebar)
2. Click **API** in the Settings menu
3. You'll see:
   - **Project URL**: `https://xxxxxxxxx.supabase.co`
   - **anon public** key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (long string)

4. **Copy both!**

---

## Step 3: Save Credentials to .env.local

**Option A - Manual (Recommended):**

Create a file named `.env.local` in your project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-actual-key-here
```

**Option B - Terminal:**

Run this (replace with your actual values):

```bash
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
EOF
```

---

## Step 4: Create Database Tables

1. In Supabase, click **SQL Editor** (📊 in sidebar)
2. Click **"New Query"**
3. Copy the ENTIRE contents of `lib/supabase/schema.sql`
4. Paste into the SQL editor
5. Click **"Run"** (or press Cmd/Ctrl + Enter)

You should see: `Success. No rows returned`

**What this creates:**
- ✅ `expense_reports` table
- ✅ `expense_items` table  
- ✅ Indexes and relationships
- ✅ Row Level Security policies

---

## Step 5: Create Storage Bucket

1. Click **Storage** (🪣 in sidebar)
2. Click **"New Bucket"**
3. Fill in:
   - **Name**: `receipts`
   - **Public bucket**: ✅ **ON** (toggle it)
4. Click **"Create bucket"**

---

## Step 6: Verify Setup

Run these commands:

```bash
# Restart dev server to load new env variables
npm run dev
```

Then:
1. Open http://localhost:3000
2. Go to Create → Camera
3. Capture a receipt
4. Fill in details → "Create expenses"

**Check Supabase:**
- Go to **Table Editor**
- You should see data in `expense_reports` and `expense_items` ✅

---

## ✅ You're Done!

Your app is now saving expense reports to Supabase!

### Verify in Console:

Look for these messages (no errors):
```
✅ Report created successfully: <uuid>
```

Instead of:
```
⚠️ Supabase not configured
❌ Failed to fetch
```

---

## 🔧 Troubleshooting

### "Error: supabaseUrl is required"
- Check `.env.local` exists in project root
- Restart dev server: `npm run dev`

### "Failed to fetch" or "ERR_NAME_NOT_RESOLVED"
- Verify credentials are correct in `.env.local`
- Check URL starts with `https://` and ends with `.supabase.co`

### "No rows returned" but no data in tables
- Verify you ran ALL of `schema.sql` (scroll to bottom)
- Check for any red error messages in SQL Editor

### Images not showing
- Verify storage bucket is set to **Public**
- Go to Storage → receipts → Settings → Make bucket public

---

## 📱 Test on Production (Vercel)

1. Go to your Vercel dashboard
2. Select your Kara project
3. Go to **Settings** → **Environment Variables**
4. Add:
   - `NEXT_PUBLIC_SUPABASE_URL` = your URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your key
5. Click **Save**
6. Redeploy: Go to **Deployments** → Click ⋯ → **Redeploy**

---

## 🎯 What's Next?

After setup works:
- Try creating multiple expense reports
- Check the inbox page to see saved reports
- Explore Supabase Table Editor to see your data
- Optional: Add authentication later
- Optional: Enable OCR processing

---

## 🆘 Still Having Issues?

Common fixes:
```bash
# 1. Delete node_modules and reinstall
rm -rf node_modules .next
npm install

# 2. Make sure .env.local is in root (not in a subfolder)
ls -la | grep .env.local

# 3. Restart terminal and dev server
npm run dev
```

Need help? Check `DATABASE_INTEGRATION.md` for more details.
