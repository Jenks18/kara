import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { exchangeSignInTokenForJwt } from '@/lib/auth/clerk-exchange';
import { corsHeaders } from '@/lib/auth/mobile-auth';

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * POST /api/auth/mobile-refresh
 * Refresh an expired Clerk session JWT.
 *
 * Accepts the old (potentially expired) JWT in the Authorization header.
 * Decodes it to extract the user ID, verifies the user still exists,
 * creates a new sign-in token, and exchanges it for a fresh JWT.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing Authorization header' },
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.slice(7);

    // Decode the JWT payload (without verification — it may be expired)
    let userId: string | null = null;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) throw new Error('Invalid JWT format');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
      userId = payload.sub || null;
    } catch {
      return NextResponse.json(
        { error: 'Invalid token format' },
        { status: 401, headers: corsHeaders }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'No user ID in token' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Verify the user still exists in Clerk
    const clerk = await clerkClient();
    let user;
    try {
      user = await clerk.users.getUser(userId);
    } catch {
      return NextResponse.json(
        { error: 'User not found — please sign in again' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Create a new sign-in token and exchange for fresh JWT
    const signInToken = await clerk.signInTokens.createSignInToken({
      userId: user.id,
      expiresInSeconds: 60,
    });

    const session = await exchangeSignInTokenForJwt(signInToken.token);

    if (!session) {
      return NextResponse.json(
        { error: 'Failed to create new session — please sign in again' },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('✅ Token refreshed for user:', userId);

    return NextResponse.json({
      success: true,
      token: session.jwt,
      userId: user.id,
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('❌ Token refresh error:', error.message);
    return NextResponse.json(
      { error: 'Token refresh failed' },
      { status: 500, headers: corsHeaders }
    );
  }
}
