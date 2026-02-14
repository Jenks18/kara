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
 * Backend proxy path for mobile password authentication
 * Uses Clerk Frontend API (only way to verify passwords serverside)
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

    const frontendApi = process.env.NEXT_PUBLIC_CLERK_FRONTEND_API;
    if (!frontendApi) {
      console.error('❌ NEXT_PUBLIC_CLERK_FRONTEND_API not configured');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('🔑 Password sign-in for:', email);

    // Step 1: Create sign-in attempt
    const signInResponse = await fetch(`${frontendApi}/v1/client/sign_ins?_clerk_js_version=4.70.0`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        identifier: email,
      }),
    });

    if (!signInResponse.ok) {
      console.error('❌ Failed to create sign-in:', signInResponse.status);
      return NextResponse.json(
        { success: false, error: 'Failed to initiate sign-in' },
        { status: signInResponse.status, headers: corsHeaders }
      );
    }

    const signInData = await signInResponse.json();
    const signInId = signInData.response?.id;

    if (!signInId) {
      console.error('❌ No sign-in ID received');
      return NextResponse.json(
        { success: false, error: 'Failed to create sign-in' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Step 2: Attempt password authentication
    const attemptResponse = await fetch(
      `${frontendApi}/v1/client/sign_ins/${signInId}/attempt_first_factor?_clerk_js_version=4.70.0`,
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          strategy: 'password',
          password: password,
        }),
      }
    );

    if (!attemptResponse.ok) {
      const errorText = await attemptResponse.text();
      console.error('❌ Password authentication failed:', attemptResponse.status, errorText);
      
      // Check if it's an invalid credentials error
      if (attemptResponse.status === 401 || attemptResponse.status === 422) {
        return NextResponse.json(
          { success: false, error: 'Invalid email or password' },
          { status: 401, headers: corsHeaders }
        );
      }
      
      return NextResponse.json(
        { success: false, error: 'Authentication failed' },
        { status: attemptResponse.status, headers: corsHeaders }
      );
    }

    const attemptData = await attemptResponse.json();
    
    // Extract JWT and userId from response
    const jwt = attemptData.client?.sessions?.[0]?.last_active_token?.jwt;
    const userId = attemptData.response?.user_id;

    if (!jwt) {
      console.error('❌ No JWT token received');
      return NextResponse.json(
        { success: false, error: 'Authentication failed - no session created' },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!userId) {
      console.error('❌ No userId in response');
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
    console.error('❌ Sign-in error:', error.message);
    return NextResponse.json(
      { success: false, error: 'Sign-in failed' },
      { status: 500, headers: corsHeaders }
    );
  }
}
