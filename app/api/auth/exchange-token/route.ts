import { NextRequest, NextResponse } from 'next/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * Sign in user and get JWT via Backend proxy (bypasses Cloudflare)
 * This performs the sign-in flow on behalf of Android from our trusted backend
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('🔄 Backend sign-in for:', email);

    const frontendApi = process.env.NEXT_PUBLIC_CLERK_FRONTEND_API;
    if (!frontendApi) {
      console.error('❌ NEXT_PUBLIC_CLERK_FRONTEND_API not configured');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Step 1: Initiate sign-in
    const signInResponse = await fetch(`${frontendApi}/v1/client/sign_ins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: email }),
    });

    if (!signInResponse.ok) {
      console.error('❌ Failed to initiate sign-in:', signInResponse.status);
      return NextResponse.json(
        { success: false, error: 'Sign-in failed' },
        { status: 500, headers: corsHeaders }
      );
    }

    const signInData = await signInResponse.json();
    const signInId = signInData.response?.id;

    if (!signInId) {
      console.error('❌ No sign-in ID received');
      return NextResponse.json(
        { success: false, error: 'Sign-in failed' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Step 2: Attempt password authentication
    const attemptResponse = await fetch(`${frontendApi}/v1/client/sign_ins/${signInId}/attempt_first_factor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        strategy: 'password',
        password: password,
      }),
    });

    if (!attemptResponse.ok) {
      console.error('❌ Password authentication failed:', attemptResponse.status);
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401, headers: corsHeaders }
      );
    }

    const attemptData = await attemptResponse.json();
    
    // Extract JWT and userId from Clerk Frontend API response
    const jwt = attemptData.client?.sessions?.[0]?.last_active_token?.jwt;
    const userId = attemptData.response?.user_id;

    if (!jwt) {
      console.error('❌ No JWT token received');
      console.log('Response structure:', JSON.stringify(attemptData, null, 2));
      return NextResponse.json(
        { success: false, error: 'Authentication failed' },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!userId) {
      console.error('❌ No userId in response');
      console.log('Response structure:', JSON.stringify(attemptData, null, 2));
      return NextResponse.json(
        { success: false, error: 'User ID not found' },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('✅ Sign-in successful! userId:', userId);

    return NextResponse.json({
      success: true,
      token: jwt,
      userId: userId,
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('❌ Backend sign-in error:', error.message);
    return NextResponse.json(
      { success: false, error: 'Sign-in failed' },
      { status: 500, headers: corsHeaders }
    );
  }
}
