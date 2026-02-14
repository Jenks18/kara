import { NextResponse } from 'next/server'

/**
 * /api/user-profile
 *
 * Profile updates now go directly through the Supabase client with
 * Clerk-minted JWTs. RLS policies enforce access at the database level.
 * No service role key needed — see lib/api/user-profiles.ts.
 *
 * This route is intentionally empty. Profile init is at /api/user-profile/init.
 */

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
