import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import https from 'https';
import { verifyMobileSessionJwt } from '@/lib/auth/mobile-jwt';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ────────────────────────────────────────────────────────────
//  JWKS cache — fetched once per cold start, reused across requests.
//  Map from kid → PEM string.
// ────────────────────────────────────────────────────────────
let jwksCache: Map<string, string> | null = null;
let jwksFetchedAt = 0;
const JWKS_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Resolve Clerk JWKS URL from env or default convention. */
function getJwksUrl(): string {
  // Explicit override (set in Vercel env if needed)
  if (process.env.CLERK_JWKS_URL) return process.env.CLERK_JWKS_URL;
  // Derive from publishable key → frontend API domain
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
  // pk format: pk_live_<base64(frontendApi)> or pk_test_<base64(frontendApi)>
  const b64 = pk.replace(/^pk_(live|test)_/, '');
  if (b64) {
    try {
      const frontendApi = Buffer.from(b64, 'base64').toString('utf-8').replace(/\$+$/, '');
      if (frontendApi) return `https://${frontendApi}/.well-known/jwks.json`;
    } catch { /* fall through */ }
  }
  throw new Error('Cannot determine Clerk JWKS URL — set CLERK_JWKS_URL or NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY');
}

/** Fetch a JSON URL over HTTPS. */
function fetchJSON(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk: string) => (data += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Invalid JSON from ${url}`)); }
      });
    }).on('error', reject);
  });
}

/** Fetch Clerk JWKS and convert each key to PEM. Cached for 1 hour. */
async function getJwksKeys(): Promise<Map<string, string>> {
  const now = Date.now();
  if (jwksCache && now - jwksFetchedAt < JWKS_TTL_MS) {
    return jwksCache;
  }

  const url = getJwksUrl();
  const jwks = await fetchJSON(url);
  const keyMap = new Map<string, string>();

  for (const key of jwks.keys) {
    if (key.kty !== 'RSA' || !key.kid) continue;
    const pem = crypto.createPublicKey({ key, format: 'jwk' })
      .export({ type: 'spki', format: 'pem' }) as string;
    keyMap.set(key.kid, pem);
  }

  if (keyMap.size === 0) {
    throw new Error(`No RSA keys found in JWKS at ${url}`);
  }

  jwksCache = keyMap;
  jwksFetchedAt = now;
  return keyMap;
}

/**
 * Verify an iOS Clerk RS256 JWT using JWKS public keys + jsonwebtoken.
 *
 * Same library (jsonwebtoken) used for Android HS256 verification — no Clerk SDK
 * in the verification path. Standard JWT.
 */
async function verifyClerkJwt(
  token: string
): Promise<{ userId: string; email: string } | null> {
  // 1. Decode header to get kid
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  let header: any;
  try {
    header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf-8'));
  } catch {
    // Try standard base64 in case base64url fails
    try {
      header = JSON.parse(Buffer.from(parts[0], 'base64').toString('utf-8'));
    } catch {
      console.error('❌ Cannot decode JWT header');
      return null;
    }
  }

  if (header.alg !== 'RS256') {
    console.error(`❌ Unexpected JWT alg: ${header.alg} (expected RS256)`);
    return null;
  }

  // 2. Fetch public key for this kid
  let pem: string | undefined;
  try {
    const keys = await getJwksKeys();
    pem = header.kid ? keys.get(header.kid) : undefined;
    // If no kid in header, and there's only one key, use it
    if (!pem && keys.size === 1) {
      pem = keys.values().next().value;
    }
  } catch (e: any) {
    console.error('❌ JWKS fetch failed:', e.message);
    return null;
  }

  if (!pem) {
    console.error(`❌ No JWKS key matches kid=${header.kid}`);
    // Force refetch on next request in case keys rotated
    jwksCache = null;
    return null;
  }

  // 3. Verify signature + standard claims
  try {
    const payload = jwt.verify(token, pem, {
      algorithms: ['RS256'],
      clockTolerance: 10, // 10 seconds — same tolerance as Android
    }) as any;

    if (!payload.sub) {
      console.error('❌ Clerk JWT verified but missing sub');
      return null;
    }

    return {
      userId: payload.sub,
      email: payload.email || '',
    };
  } catch (e: any) {
    console.error('❌ RS256 JWT verification failed:', e.message);
    return null;
  }
}

/**
 * Verify the mobile session JWT and extract the user's identity.
 *
 * Android: HS256 JWT minted by our backend, verified with CLERK_SECRET_KEY.
 * iOS: RS256 JWT from Clerk iOS SDK, verified with Clerk JWKS public keys.
 *
 * Both use the same library (jsonwebtoken). No Clerk SDK in the verification path.
 */
export async function verifyAndExtractUser(
  request: NextRequest
): Promise<{ userId: string; email: string } | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    console.warn('⚠️ verifyAndExtractUser: no Bearer token');
    return null;
  }

  const token = authHeader.slice(7).trim();
  if (!token) return null;

  // ── Path 1: Backend-minted HS256 JWT (Android) ──
  // CPU-local verification, no network call. Checked first because it's faster.
  const mobileResult = verifyMobileSessionJwt(token);
  if (mobileResult) {
    return mobileResult;
  }

  // ── Path 2: Clerk RS256 JWT (iOS) ──
  // Verified via JWKS public keys — standard JWT, no Clerk SDK.
  const clerkResult = await verifyClerkJwt(token);
  if (clerkResult) {
    // Enrich with email from Clerk if not in token (non-fatal)
    if (!clerkResult.email) {
      try {
        const clerk = await clerkClient();
        const user = await clerk.users.getUser(clerkResult.userId);
        clerkResult.email = user.emailAddresses?.[0]?.emailAddress || '';
      } catch {
        // Non-fatal — RLS only needs sub (user_id)
      }
    }
    return clerkResult;
  }

  console.warn('⚠️ Token is neither a valid backend JWT nor a valid Clerk JWT');
  return null;
}

/**
 * Validate mobile token and return userId.
 */
export async function validateMobileToken(request: NextRequest): Promise<string | null> {
  const result = await verifyAndExtractUser(request);
  return result?.userId || null;
}

/**
 * Extract userId from JWT (simple decode — no signature check).
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
