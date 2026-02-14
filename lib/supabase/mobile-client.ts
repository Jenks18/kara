import { createClient, SupabaseClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { verifyAndExtractUser } from '@/lib/auth/mobile-auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET || '';

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
      'SUPABASE_JWT_SECRET not configured. ' +
      'Get it from Supabase Dashboard → Settings → API → JWT Secret. ' +
      'Falling back to supabaseAdmin (no RLS).'
    );
    return null;
  }

  const user = await verifyAndExtractUser(request);
  if (!user) return null;

  // Mint a Supabase-compatible JWT with the claims that RLS policies expect.
  // - sub: Clerk user ID → accessed via auth.uid() in RLS
  // - email: user's email → accessed via auth.jwt()->>'email' in RLS
  // - aud/role: required by Supabase to treat this as an authenticated request
  const supabaseToken = jwt.sign(
    {
      sub: user.userId,
      email: user.email,
      aud: 'authenticated',
      role: 'authenticated',
      // Include user_id as a custom claim for backward compatibility
      user_id: user.userId,
    },
    supabaseJwtSecret,
    { expiresIn: '1h' }
  );

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${supabaseToken}`,
      },
    },
  });

  return { supabase, userId: user.userId, email: user.email };
}
