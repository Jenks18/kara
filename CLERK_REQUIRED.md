# Quick Start: Clerk Setup Required

## ⚠️ Build Error: Invalid Clerk Keys

The application **requires valid Clerk API keys** to build. The placeholder keys will cause build failures.

## Get Clerk Keys (2 minutes)

1. **Go to** https://dashboard.clerk.com
2. **Sign up** with GitHub or email (free)
3. **Create Application**:
   - Name: "Kara"
   - Sign-in options: Email + Password
4. **Copy API Keys** from dashboard

## Add Keys to .env.local

Replace the placeholder keys in `.env.local`:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_ACTUAL_KEY_HERE
CLERK_SECRET_KEY=sk_test_YOUR_ACTUAL_KEY_HERE
```

## Build Again

```bash
npm run build
```

## What Changed?

- **Authentication**: Users must sign in (no more hardcoded email)
- **Multi-Tenant**: Each user sees only their own reports  
- **Database**: `user_id` column added with RLS policies
- **Routes**: `/sign-in`, `/sign-up`, `/account` pages

## Supabase Migration

Run this SQL in Supabase SQL Editor:

```sql
-- See migrations/001-add-multi-tenant.sql
```

This adds:
- `user_id` column to `expense_reports`
- RLS policies for multi-tenant isolation
- Indexes for performance

## Test Locally

```bash
npm run dev
```

Visit http://localhost:3000 - you'll be redirected to sign-in.

## Deploy to Vercel

```bash
# Add Clerk keys
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production
vercel env add CLERK_SECRET_KEY production

# Deploy
vercel --prod
```

## Need Help?

- Clerk Docs: https://clerk.com/docs/quickstarts/nextjs
- Issues: Check CLERK_SETUP.md for detailed guide
