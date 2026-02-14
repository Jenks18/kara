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

export async function POST(req: NextRequest) {
  try {
    const { email, password, username, firstName, lastName } = await req.json();

    if (!email || !password || !username || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('📱 Sign-up request:', { email, username });

    // Step 1: Create user with Backend SDK (bypasses CAPTCHA, auto-verifies email)
    const client = await clerkClient();
    const clerkUser = await client.users.createUser({
      emailAddress: [email],
      password: password,
      username: username,
      firstName: firstName,
      lastName: lastName,
      skipPasswordChecks: false,
      skipPasswordRequirement: false,
    });

    console.log('✅ User created:', clerkUser.id);

    // Step 2: Create sign-in token (Backend SDK)
    const signInToken = await client.signInTokens.createSignInToken({
      userId: clerkUser.id,
      expiresInSeconds: 600,
    });

    console.log('✅ Sign-in token created');

    // Step 3: Exchange token for JWT server-side (single-step, no cookies needed)
    const session = await exchangeSignInTokenForJwt(signInToken.token);

    if (!session) {
      // User was created but token exchange failed — still return success with token
      // so Android can retry the exchange via /api/auth/exchange-token
      console.warn('⚠️ Token exchange failed, returning sign-in token for client-side retry');
      return NextResponse.json(
        {
          success: true,
          userId: clerkUser.id,
          email: email,
          signInToken: signInToken.token,
          token: null,
          message: 'Account created. Use exchange-token endpoint for JWT.',
        },
        { status: 200, headers: corsHeaders }
      );
    }

    console.log('✅ Sign-up complete with JWT! userId:', session.userId);

    return NextResponse.json(
      {
        success: true,
        userId: clerkUser.id,
        email: email,
        token: session.jwt,
        message: 'Account created and authenticated!',
      },
      { status: 200, headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('❌ Sign-up error:', error.message);

    if (error.errors?.[0]?.code === 'form_identifier_exists') {
      return NextResponse.json(
        { success: false, error: 'Email or username already exists.' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (error.status === 422) {
      const errorMessage = error.errors?.[0]?.message || 'Invalid registration details';
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Sign-up failed' },
      { status: 500, headers: corsHeaders }
    );
  }
}
