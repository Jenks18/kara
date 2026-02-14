import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * Helper: exchange a sign-in token for a Clerk JWT via Frontend API (single-step).
 */
async function exchangeSignInTokenForJwt(token: string): Promise<{ jwt: string; userId: string } | null> {
  const frontendApi = process.env.NEXT_PUBLIC_CLERK_FRONTEND_API;
  if (!frontendApi) {
    console.error('❌ NEXT_PUBLIC_CLERK_FRONTEND_API not configured');
    return null;
  }

  const response = await fetch(`${frontendApi}/v1/client/sign_ins?_clerk_js_version=4.70.0`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ strategy: 'ticket', ticket: token }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Token exchange failed:', response.status, errorText);
    return null;
  }

  const data = await response.json();
  const jwt = data.client?.sessions?.[0]?.last_active_token?.jwt;
  const userId = data.response?.user_id;

  if (!jwt) {
    console.error('❌ No JWT in exchange response');
    return null;
  }

  return { jwt, userId: userId || '' };
}

/**
 * Mobile password sign-in endpoint.
 * Uses Backend SDK to verify password + sign-in tokens for JWT creation.
 * Eliminates fragile Frontend API two-step cookie management.
 */
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password required' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('🔑 Password sign-in for:', email);

    const client = await clerkClient();

    // Step 1: Find user by email (Backend SDK)
    const users = await client.users.getUserList({
      emailAddress: [email],
    });

    if (users.data.length === 0) {
      console.log('❌ No user found for:', email);
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401, headers: corsHeaders }
      );
    }

    const user = users.data[0];
    console.log('✅ User found:', user.id);

    // Step 2: Verify password (Backend SDK)
    try {
      const { verified } = await client.users.verifyPassword({ userId: user.id, password });
      if (!verified) {
        console.log('❌ Password verification failed for:', email);
        return NextResponse.json(
          { success: false, error: 'Invalid email or password' },
          { status: 401, headers: corsHeaders }
        );
      }
    } catch (verifyError: any) {
      console.error('❌ Password verification error:', verifyError.message);
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401, headers: corsHeaders }
      );
    }

    console.log('✅ Password verified');

    // Step 3: Create sign-in token (Backend SDK)
    const signInToken = await client.signInTokens.createSignInToken({
      userId: user.id,
      expiresInSeconds: 60,
    });

    console.log('✅ Sign-in token created');

    // Step 4: Exchange token for JWT (single-step Frontend API)
    const session = await exchangeSignInTokenForJwt(signInToken.token);

    if (!session) {
      console.error('❌ Failed to exchange sign-in token for JWT');
      return NextResponse.json(
        { success: false, error: 'Authentication failed' },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('✅ Sign-in successful! userId:', user.id);

    return NextResponse.json({
      success: true,
      token: session.jwt,
      userId: user.id,
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('❌ Sign-in error:', error.message);
    return NextResponse.json(
      { success: false, error: 'Sign-in failed' },
      { status: 500, headers: corsHeaders }
    );
  }
}
