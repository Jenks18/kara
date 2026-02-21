import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { createClerkClient } from '@clerk/backend';
import { verifyMobileSessionJwt } from '@/lib/auth/mobile-jwt';

/**
 * Singleton Clerk backend client for authenticateRequest.
 * Lazily created so it never throws at module evaluation if the env var is missing.
 */
function getClerkBackend() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!secretKey || !publishableKey) {
    console.error('❌ CLERK_SECRET_KEY or NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY missing from environment');
    return null;
  }
  return createClerkClient({ secretKey, publishableKey });
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Verify the mobile session JWT and extract the user's identity.
 *
 * Primary path: Self-minted mobile JWTs (HS256, signed with CLERK_SECRET_KEY).
 * These are the only tokens the backend issues for mobile clients.
 *
 * Secondary path: Clerk-issued JWTs (JWKS) — kept only for backward
 * compatibility with any sessions created before the migration.
 *
 * Both paths verify token signatures. No unsigned fallback.
 */
export async function verifyAndExtractUser(
  request: NextRequest
): Promise<{ userId: string; email: string } | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);

  // Primary: Self-minted mobile session JWT (HS256 + CLERK_SECRET_KEY)
  const mobileResult = verifyMobileSessionJwt(token);
  if (mobileResult) {
    return mobileResult;
  }

  // Secondary: Clerk-issued JWT (iOS Clerk SDK sends RS256 session tokens)
  // Use authenticateRequest — the official Clerk API for verifying Bearer tokens
  // in custom backend routes. Handles JWKS fetching, caching, and all token types.
  const clerkBackend = getClerkBackend();
  if (clerkBackend) {
    try {
      const requestState = await clerkBackend.authenticateRequest(request, {
        publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      });

      if (requestState.isSignedIn) {
        const auth = requestState.toAuth()!;
        const userId = auth.userId;

        // Get email non-fatally — RLS only needs sub (user_id), email is for logging
        let email = '';
        try {
          const clerk = await clerkClient();
          const user = await clerk.users.getUser(userId);
          email = user.emailAddresses?.[0]?.emailAddress || '';
        } catch {
          // Non-fatal — proceed without email
        }

        return { userId, email };
      }

      console.error('❌ Clerk authenticateRequest: not signed in. Reason:', requestState.reason, requestState.message);
    } catch (e: any) {
      console.error('❌ Clerk authenticateRequest threw:', e?.message || e);
    }
  }

  console.warn('❌ Token verification failed: not a valid mobile or Clerk JWT');
  return null;
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
