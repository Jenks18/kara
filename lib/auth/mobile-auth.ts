import { NextRequest, NextResponse } from 'next/server';
import { clerkClient, verifyToken } from '@clerk/nextjs/server';
import { verifyMobileSessionJwt } from '@/lib/auth/mobile-jwt';

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

  // Secondary: Clerk-issued JWT (backward compat for existing sessions)
  try {
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (secretKey) {
      const payload = await verifyToken(token, { secretKey });
      const userId = payload.sub;
      if (!userId) return null;

      const clerk = await clerkClient();
      const user = await clerk.users.getUser(userId);
      const email = user.emailAddresses?.[0]?.emailAddress;
      if (!email) return null;

      return { userId, email };
    }
  } catch {
    // Not a Clerk JWT either
  }

  console.warn('❌ Token verification failed: not a valid mobile or Clerk JWT');
  return null;
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
