# Clerk + Supabase Auth Integration Setup

This enables automatic RLS filtering without manual `.eq('user_email', email)` filters everywhere.

## 1. Configure Clerk JWT Template

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Navigate to **JWT Templates** (in sidebar under "Configure")
4. Click **+ New template**
5. Select **Supabase** template
6. Configure the template:
   ```json
   {
     "user_id": "{{user.id}}",
     "email": "{{user.primary_email_address}}"
   }
   ```
7. Name it: `supabase`
8. Copy the **JWKS Endpoint URL** (you'll need this)

## 2. Configure Supabase Authentication

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** → **Providers**
4. Scroll to **JWT** section
5. Enable JWT authentication
6. Paste the **JWKS Endpoint URL** from Clerk
7. Set **JWT Verification Method**: `JWKS`
8. Save changes

## 3. Apply RLS Policies

Run this SQL in Supabase SQL Editor:

```bash
# Connect to your Supabase database
psql $DATABASE_URL

# Or use Supabase Dashboard → SQL Editor
```

Then run:
```sql
\i lib/supabase/rls-policies.sql
```

## 4. Verify Setup

Test that RLS is working:

```sql
-- This should return only YOUR data (not all users)
SELECT * FROM expense_reports;
SELECT * FROM expense_items;
```

## How It Works

### Before (Manual Filtering):
```typescript
const supabase = createClient(url, serviceRoleKey)
const { data } = await supabase
  .from('expense_reports')
  .select('*')
  .eq('user_email', userEmail) // ❌ Easy to forget!
```

### After (Automatic RLS):
```typescript
const supabase = await createServerClient() // Uses Clerk JWT
const { data } = await supabase
  .from('expense_reports')
  .select('*') // ✅ RLS auto-filters by authenticated user!
```

## Benefits

✅ **Secure by default** - Can't forget to filter by user
✅ **Less code** - No manual `.eq('user_email', email)` everywhere
✅ **Database-enforced** - Security at the data layer
✅ **Works everywhere** - Server components, API routes, Edge functions

## Troubleshooting

### "No rows returned" error
- Check JWT template in Clerk has correct claims
- Verify JWKS URL is correct in Supabase
- Ensure user_email in database matches Clerk email

### "permission denied" error
- RLS policies may be too restrictive
- Check user is authenticated: `SELECT auth.jwt()->>'email'`
- Verify RLS policies are applied: `SELECT * FROM pg_policies`

### JWT not working
- Clerk template must be named exactly `supabase`
- Call: `getToken({ template: 'supabase' })` in code
- Check Clerk session exists before calling

## Migration from Old Auth

The old `createAuthenticatedClient()` used service_role key with custom headers. The new `createServerClient()` uses proper JWT tokens with RLS.

Old code still works but should be migrated for proper security.
