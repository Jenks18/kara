# Clerk Multi-Tenant Setup Guide

This project has been migrated to use **Clerk** for authentication and is now a **multi-tenant application**.

## What Changed

1. **Authentication**: No more hardcoded email - users log in with Clerk
2. **Multi-Tenant**: Each user only sees their own expense reports
3. **Database**: Added `user_id` column to `expense_reports` table with RLS policies
4. **Images**: Cleared all existing image data from database (stored as base64, now NULL)

## Setup Steps

### 1. Create Clerk Account

1. Go to https://dashboard.clerk.com
2. Sign up or log in
3. Create a new application for "Kara"
4. Copy your API keys

### 2. Add Clerk Keys to .env.local

Update `.env.local` with your Clerk credentials:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_... # from Clerk dashboard
CLERK_SECRET_KEY=sk_test_... # from Clerk dashboard

# These should already be set:
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
```

### 3. Update Supabase RLS Policies

Run the migration SQL to add multi-tenant support:

```bash
# Go to Supabase SQL editor and run:
# migrations/001-add-multi-tenant.sql
```

Key changes:
- Added `user_id` column to `expense_reports` (stores Clerk user ID)
- Created RLS policies that check `auth.uid()` against user_id
- Expense items protected via report ownership

### 4. Clear Existing Data

All existing image data (base64) has been set to NULL. To manually clear:

```sql
-- Clear images from all reports
UPDATE expense_items SET image_url = NULL;
```

### 5. Test Locally

```bash
npm run dev
# Visit http://localhost:3000
# Should redirect to /sign-in if not authenticated
```

First-time users will see sign-up, existing users can sign in.

### 6. Deploy to Vercel

```bash
# Add Clerk keys to Vercel
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production
vercel env add CLERK_SECRET_KEY production
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY preview
vercel env add CLERK_SECRET_KEY preview
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY development
vercel env add CLERK_SECRET_KEY development

# Deploy
vercel --prod
```

## Architecture

### Authentication Flow

```
User visits app
    ↓
Middleware checks auth
    ↓
Not signed in? → Redirect to /sign-in
    ↓
Signed in? → Access dashboard
```

### Data Isolation

```
/api/expense-reports
  ↓
auth.userId extracted from token
  ↓
Query: SELECT * FROM expense_reports WHERE user_id = ${userId}
  ↓
RLS policies ensure isolation at database level
```

### Protected Routes

- `/create` - Create expense reports
- `/reports` - View all reports
- `/api/expense-reports/*` - All API endpoints

## API Changes

### Before (Single User)
```typescript
const reports = await getExpenseReports('user@example.com')
```

### After (Multi-Tenant)
```typescript
const { user } = useUser() // From Clerk
const reports = await getExpenseReports(user.id)
```

## User Data from Clerk

Components can access user info:

```typescript
import { useUser } from '@clerk/nextjs'

function MyComponent() {
  const { user } = useUser()
  
  return (
    <div>
      {user?.emailAddresses[0]?.emailAddress}
      {user?.firstName} {user?.lastName}
    </div>
  )
}
```

## Testing Multi-Tenant Isolation

1. Sign up with account A
2. Create an expense report
3. Sign out
4. Sign up with account B
5. Verify: Account B should NOT see Account A's reports

## Troubleshooting

### "Clerk not configured"
- Check `.env.local` has both keys
- Restart dev server after adding keys

### "Unauthorized" on API calls
- Ensure middleware.ts is in root directory
- Check auth() call in route handlers

### RLS policy errors
- Verify Supabase project has RLS enabled
- Run migration SQL from `migrations/001-add-multi-tenant.sql`

### Reports not appearing
- Verify user_id matches Clerk user ID in database
- Check RLS policies are correctly configured

## Next Steps

1. Set up Clerk in production
2. Configure Supabase RLS policies
3. Test with multiple users
4. Monitor user isolation

For Clerk help: https://clerk.com/docs
For Supabase RLS: https://supabase.com/docs/guides/auth/row-level-security
