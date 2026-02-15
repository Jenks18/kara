import { createClient, SupabaseClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { verifyAndExtractUser } from '@/lib/auth/mobile-auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
// Clean the secret: trim whitespace, strip literal \n that Vercel env can add
const supabaseJwtSecret = (process.env.SUPABASE_JWT_SECRET || '')
  .trim()
  .replace(/\\n/g, '')
  .replace(/\n/g, '');

/**
 * Create a Supabase client for a mobile user with RLS enabled.
 *
 * This is the mobile equivalent of createServerClient() used by the webapp.
 * Instead of relying on Clerk's getToken({ template: 'supabase' }), we:
 *   1. Verify the Clerk JWT (signature checked via JWKS)
 *   2. Mint a Supabase-compatible JWT with the correct claims
 *   3. Create a Supabase client with anon key + that JWT
 *   4. RLS policies automatically filter data — no manual .eq('user_id', ...) needed!
 *
 * Requires SUPABASE_JWT_SECRET env var (from Supabase Dashboard → Settings → API → JWT Secret).
 */
export async function createMobileClient(
  request: NextRequest
): Promise<{ supabase: SupabaseClient; userId: string; email: string } | null> {
  if (!supabaseJwtSecret) {
    console.error(
      'FATAL: SUPABASE_JWT_SECRET not configured. ' +
      'Get it from Supabase Dashboard → Settings → API → JWT Secret.'
    );
    return null;
  }

  const user = await verifyAndExtractUser(request);
  if (!user) return null;

  // Mint a Supabase-compatible JWT with the claims that RLS policies expect.
  // - iss: must be 'supabase' to match PostgREST config
  // - sub: Clerk user ID → accessed via (auth.jwt()->>'sub') in RLS
  //   NOTE: Do NOT use auth.uid() — it casts sub to UUID, which fails for Clerk IDs
  // - email: user's email → accessed via (auth.jwt()->>'email') in RLS
  // - aud/role: required by Supabase to treat this as an authenticated request
  const now = Math.floor(Date.now() / 1000);
  const supabaseToken = jwt.sign(
    {
      iss: 'supabase',
      sub: user.userId,
      email: user.email,
      aud: 'authenticated',
      role: 'authenticated',
      user_id: user.userId,
      iat: now,
      exp: now + 3600,
    },
    supabaseJwtSecret,
    { algorithm: 'HS256' }
  );

  // Mint token silently — no log per request
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${supabaseToken}`,
      },
    },
  });

  return { supabase, userId: user.userId, email: user.email };
}
