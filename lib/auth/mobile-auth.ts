import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { verifyToken } from '@clerk/backend';
import { verifyMobileSessionJwt } from '@/lib/auth/mobile-jwt';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Verify the mobile session JWT and extract the user's identity.
 *
 * Primary path (Android): Self-minted HS256 JWTs signed with CLERK_SECRET_KEY.
 * The backend mints these after verifying identity via Clerk Backend SDK.
 * Verification is CPU-local — no network calls.
 *
 * Secondary path (iOS): Clerk SDK RS256 JWTs verified via JWKS.
 * The iOS Clerk SDK generates session tokens signed by Clerk's private key.
 * We verify by fetching Clerk's JWKS (cached across warm invocations).
 */
export async function verifyAndExtractUser(
  request: NextRequest
): Promise<{ userId: string; email: string } | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    console.warn('⚠️ verifyAndExtractUser: no Bearer token in Authorization header');
    return null;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    console.warn('⚠️ verifyAndExtractUser: empty Bearer token');
    return null;
  }

  // ── Primary: Self-minted mobile session JWT (HS256, Android) ──
  const mobileResult = verifyMobileSessionJwt(token);
  if (mobileResult) {
    return mobileResult;
  }

  // ── Secondary: Clerk SDK JWT (RS256, iOS) ──
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    console.error('❌ CLERK_SECRET_KEY not configured — cannot verify Clerk JWTs');
    return null;
  }

  try {
    // verifyToken (from @clerk/backend):
    //   1. Uses secretKey to fetch JWKS from Clerk API
    //   2. Caches JWKS in-memory (survives across warm function invocations)
    //   3. Matches the token's `kid` header to a JWKS key
    //   4. Verifies RS256 signature
    //   5. Returns decoded JWT claims on success, throws on failure
    const payload = await verifyToken(token, {
      secretKey,
      // 10s clock-skew tolerance — accounts for mobile device clock drift
      // and network latency between token issuance and verification
      clockSkewInMs: 10_000,
    });

    if (!payload || !payload.sub) {
      console.error('❌ Clerk JWT verified but missing sub claim');
      return null;
    }

    const userId = payload.sub as string;

    // Get email non-fatally — used for profile enrichment, not for RLS
    let email = '';
    try {
      const clerk = await clerkClient();
      const user = await clerk.users.getUser(userId);
      email = user.emailAddresses?.[0]?.emailAddress || '';
    } catch {
      // Non-fatal — RLS only needs `sub` (user_id)
    }

    return { userId, email };
  } catch (error: any) {
    // Log full error context for Vercel Function Logs debugging
    console.error('❌ Clerk JWT verification failed:', error?.message || String(error));
    if (error?.reason) {
      console.error('   Reason:', error.reason);
    }
    // Log token header (contains `kid` and `alg` — no secrets)
    try {
      const headerB64 = token.split('.')[0];
      const header = JSON.parse(
        Buffer.from(headerB64, 'base64url').toString('utf-8')
      );
      console.error('   Token header:', JSON.stringify(header));
    } catch {
      console.error('   Token is not a valid JWT (cannot decode header)');
    }
    return null;
  }
}

/**
 * Validate mobile token and return userId.
 * Wrapper around verifyAndExtractUser for simpler userId-only validation.
 */
export async function validateMobileToken(request: NextRequest): Promise<string | null> {
  const result = await verifyAndExtractUser(request);
  return result?.userId || null;
}

/**
 * Extract userId from JWT (simple decode for backward compatibility).
 * DEPRECATED: Use verifyAndExtractUser() for secure verification.
 */
export function getUserIdFromJwt(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
    return payload.sub || null;
  } catch {
    return null;
  }
}

/**
 * Get the user's email from Clerk using their userId.
 */
export async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    return user.emailAddresses?.[0]?.emailAddress || null;
  } catch {
    return null;
  }
}

/**
 * Standard unauthorized response for mobile endpoints.
 */
export function unauthorizedResponse() {
  return NextResponse.json(
    { error: 'Missing or invalid Authorization token' },
    { status: 401, headers: corsHeaders }
  );
}
