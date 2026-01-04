# 🗄️ Supabase Setup Guide

## What's Been Set Up

I've integrated Supabase for storing expense reports. Here's what you need to do:

---

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in:
   - **Name**: Kara Expense Tracker
   - **Database Password**: (save this!)
   - **Region**: Choose closest to Kenya (e.g., Singapore or Europe West)
4. Wait ~2 minutes for project to provision

---

## 2. Run the Database Schema

1. In your Supabase project, go to **SQL Editor** (left sidebar)
2. Click "New Query"
3. Copy the entire contents of `/lib/supabase/schema.sql`
4. Paste and click **Run**

This creates:
- `expense_reports` table - Stores report metadata
- `expense_items` table - Stores individual receipts
- Proper indexes and relationships
- Row Level Security (RLS) policies

---

## 3. Set Up Storage Bucket

1. Go to **Storage** (left sidebar)
2. Click "New Bucket"
3. Name it: `receipts`
4. Set to **Public** (so images can be viewed)
5. Click "Create bucket"

---

## 4. Get Your API Keys

1. Go to **Settings** → **API** (left sidebar)
2. Copy:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIs...` (long string)

---

## 5. Configure Environment Variables

1. Create `.env.local` file in project root (if it doesn't exist)
2. Add your Supabase credentials:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Google Gemini API (for OCR - optional for now)
GEMINI_API_KEY=your-gemini-api-key
```

3. Restart your development server: `npm run dev`

---

## 6. Test It Out

1. Go to http://localhost:3000/create
2. Capture some receipts
3. Fill in expense details
4. Click "Create expenses"
5. Check your Supabase dashboard:
   - Go to **Table Editor**
   - You should see data in `expense_reports` and `expense_items`
6. Go back to Inbox - you should see your expense report!

---

## How It Works

### When You Submit Expenses:

1. **ReceiptCapture** component calls `createExpenseReport()`
2. Creates record in `expense_reports` table
3. Uploads images to Supabase Storage (`receipts` bucket)
4. Creates records in `expense_items` for each receipt
5. Returns success + report ID

### On the Inbox Page:

1. Calls `getExpenseReports()` on page load
2. Fetches reports from database
3. Joins with expense items
4. Displays as cards with thumbnails

---

## Database Structure

### expense_reports
```sql
- id (uuid, primary key)
- created_at (timestamp)
- user_email (text) - "injenga@terpmail.umd.edu"
- workspace_name (text) - "Terpmail's Workspace"
- title (text) - "Expense Report 2026-01-03"
- status (text) - draft/submitted/approved/rejected
- total_amount (numeric) - Calculated from items
```

### expense_items
```sql
- id (uuid, primary key)
- report_id (uuid, foreign key)
- image_url (text) - Supabase Storage URL
- description (text)
- category (text) - Fuel/Food/etc
- amount (numeric) - From OCR processing
- reimbursable (boolean)
- latitude/longitude (numeric) - Location data
- processing_status (text) - scanning/processed/error
- merchant_name (text) - From OCR
```

---

## Features Included

✅ **Automatic Image Upload**: Base64 images converted and uploaded to Supabase Storage
✅ **Report Grouping**: Multiple receipts in one expense report
✅ **Status Tracking**: Draft → Submitted → Approved workflow
✅ **Location Data**: Latitude/longitude saved with each expense
✅ **Workspace Association**: Reports linked to specific workspaces
✅ **Real-time Updates**: Changes reflect immediately on refresh

---

## Next Steps (Optional)

### Add Authentication
```typescript
// lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// For authenticated requests
export const supabase = createClientComponentClient()
```

### Enable RLS Policies
Once you add auth, update RLS policies:
```sql
-- Only show users their own reports
CREATE POLICY "Users see own reports" ON expense_reports
  FOR SELECT USING (auth.uid() = user_id);
```

### Add OCR Processing
When items are created, call your OCR API:
```typescript
// After creating expense items
for (const item of createdItems) {
  fetch('/api/receipts/upload', {
    method: 'POST',
    body: JSON.stringify({ itemId: item.id, imageUrl: item.image_url })
  })
}
```

---

## Troubleshooting

### "Failed to create report"
- Check `.env.local` has correct Supabase URL and key
- Verify schema.sql ran successfully
- Check browser console for detailed errors

### Images Not Showing
- Ensure `receipts` bucket is set to **Public**
- Check Storage policies allow public read access

### No Reports on Inbox
- Check Supabase Table Editor - do you have data?
- Verify user_email matches: `injenga@terpmail.umd.edu`
- Check browser console for API errors

---

## API Reference

### Create Report
```typescript
import { createExpenseReport } from '@/lib/api/expense-reports'

const result = await createExpenseReport({
  userEmail: 'user@example.com',
  workspaceName: 'My Workspace',
  title: 'Expense Report 2026-01-03',
  items: [
    {
      imageData: 'data:image/jpeg;base64,...',
      category: 'Fuel',
      reimbursable: true
    }
  ]
})
```

### Get Reports
```typescript
import { getExpenseReports } from '@/lib/api/expense-reports'

const reports = await getExpenseReports('user@example.com', 10)
// Returns array of ExpenseReport objects with items
```

### Update Status
```typescript
import { updateReportStatus } from '@/lib/api/expense-reports'

await updateReportStatus(reportId, 'submitted')
// Changes status and sets submitted_at timestamp
```

---

## Files Created

- ✅ `lib/supabase/client.ts` - Supabase client configuration
- ✅ `lib/supabase/schema.sql` - Database schema
- ✅ `lib/api/expense-reports.ts` - API functions for CRUD operations
- ✅ `.env.local.example` - Environment variable template
- ✅ Updated `components/receipt/ReceiptCapture.tsx` - Save to DB on submit
- ✅ Updated `app/page.tsx` - Display reports from DB

---

## Cost

**Free Tier Includes:**
- 500MB database storage
- 1GB file storage
- 50MB bandwidth/day
- 2 million requests/month

Perfect for development and small-scale production! 🚀
