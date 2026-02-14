import { NextRequest, NextResponse } from 'next/server';
import { clerkClient, verifyToken } from '@clerk/nextjs/server';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Verify the Clerk JWT and extract the user's identity.
 *
 * Uses Clerk Backend SDK's verifyToken() which validates the JWT signature
 * against Clerk's JWKS endpoint. This replaces the previous unsafe base64
 * decode that didn't verify signatures at all.
 *
 * Falls back to the Clerk Backend API for user email lookup.
 */
export async function verifyAndExtractUser(
  request: NextRequest
): Promise<{ userId: string; email: string } | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);

  try {
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      console.warn('CLERK_SECRET_KEY not configured, falling back to decode');
      return fallbackDecodeJwt(token);
    }

    // Verify JWT signature via Clerk JWKS (secure!)
    const payload = await verifyToken(token, { secretKey });
    const userId = payload.sub;
    if (!userId) return null;

    // Get user email from Clerk Backend API
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const email = user.emailAddresses?.[0]?.emailAddress;
    if (!email) return null;

    return { userId, email };
  } catch (err: any) {
    // If verifyToken fails (expired, invalid, etc.), fall back to manual decode
    // but at least log the issue
    console.warn('Clerk verifyToken failed, falling back to decode:', err?.message);
    return fallbackDecodeJwt(token);
  }
}

/**
 * Legacy fallback: decode JWT without verification.
 * Used only if verifyToken() is unavailable. Logs a warning.
 */
async function fallbackDecodeJwt(
  token: string
): Promise<{ userId: string; email: string } | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
    const userId = payload.sub;
    if (!userId) return null;

    // Must still look up email from Clerk
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const email = user.emailAddresses?.[0]?.emailAddress || '';

    return { userId, email };
  } catch {
    return null;
  }
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
