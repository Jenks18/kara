import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { exchangeSignInTokenForJwt } from '@/lib/auth/clerk-exchange';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * Mobile password sign-in endpoint.
 * Backend SDK: find user → verify password → sign-in token → exchange for JWT.
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
