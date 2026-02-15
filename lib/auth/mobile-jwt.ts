/**
 * Mobile Session JWT — the sole token system for the Android app.
 *
 * ARCHITECTURE:
 * The backend is the single authority for authentication. After verifying
 * user identity via Clerk Backend SDK (password check, Google token, etc.),
 * the backend mints this JWT and returns it to the Android app. The Android
 * app NEVER talks to Clerk directly — no Frontend API, no client-side
 * exchange, no browser-based auth.
 *
 * SECURITY:
 * - Signed with CLERK_SECRET_KEY (HS256) — available only on the server
 * - Contains standard JWT claims (sub, email, exp, iss, aud)
 * - Verified by mobile-auth.ts (verifyMobileSessionJwt) before granting access
 * - Short-lived (15 minutes), refreshable via /api/auth/mobile-refresh
 *
 * SCALE:
 * HS256 verification is CPU-local (no network calls), making this suitable
 * for thousands of concurrent users without external API rate limits.
 */

import jwt from 'jsonwebtoken';

const mobileJwtSecret = process.env.CLERK_SECRET_KEY || '';

/**
 * Mint a mobile session JWT after the user's identity has been verified
 * by Clerk Backend SDK (password check, Google token verification, etc.).
 *
 * This JWT is what the Android app stores and sends as Bearer token.
 */
export function mintMobileSessionJwt(userId: string, email: string): string {
  if (!mobileJwtSecret) {
    throw new Error('CLERK_SECRET_KEY not configured — cannot mint mobile JWT');
  }

  const now = Math.floor(Date.now() / 1000);

  return jwt.sign(
    {
      iss: 'mafutapass',       // Issuer — distinguishes from Clerk-issued JWTs
      sub: userId,             // Clerk user ID
      email: email,
      aud: 'mobile',           // Audience — mobile app
      role: 'authenticated',
      sid: `mob_${now}_${Math.random().toString(36).slice(2, 8)}`, // Session-like ID
      iat: now,
      exp: now + 900,          // 15 minutes — deleted users locked out within this window
    },
    mobileJwtSecret,
    { algorithm: 'HS256' }
  );
}

/**
 * Verify a self-minted mobile session JWT.
 * Returns the user identity if valid, null if invalid/expired.
 */
export function verifyMobileSessionJwt(
  token: string
): { userId: string; email: string } | null {
  if (!mobileJwtSecret) return null;

  try {
    const payload = jwt.verify(token, mobileJwtSecret, {
      algorithms: ['HS256'],
      issuer: 'mafutapass',
    }) as any;

    if (!payload.sub) return null;

    return {
      userId: payload.sub,
      email: payload.email || '',
    };
  } catch {
    return null;
  }
}
