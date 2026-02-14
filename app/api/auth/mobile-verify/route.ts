import { NextRequest, NextResponse } from 'next/server';

/**
 * DEPRECATED: Email verification no longer needed
 * 
 * Backend SDK auto-verifies email addresses when creating accounts.
 * Sign-up flow now provides immediate authentication via sign-in tokens.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  return NextResponse.json(
    { 
      error: 'This endpoint is deprecated.',
      message: 'Email verification is no longer required. Accounts are auto-verified on sign-up.'
    },
    { status: 410, headers: corsHeaders }
  );
}

    if (!signInResponse.ok) {
      const errorText = await signInResponse.text();
      console.error('❌ [VERIFY] Sign-in initiation failed:', errorText);
      return NextResponse.json(
        { error: 'Failed to initiate verification' },
        { status: 500, headers: corsHeaders }
      );
    }

    const signInData = await signInResponse.json();
    const signInId = signInData.response?.id;

    if (!signInId) {
      console.error('❌ [VERIFY] No sign-in ID in response');
      return NextResponse.json(
        { error: 'Invalid response from auth server' },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('✅ [VERIFY] Sign-in initiated, ID:', signInId);

    // Step 2: Attempt email verification with the code
    console.log('📧 [VERIFY] Step 2: Verifying email code...');
    const verifyResponse = await fetch(
      `${CLERK_FRONTEND_API}/v1/client/sign_ins/${signInId}/attempt_first_factor`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          strategy: 'email_code',
          code: code,
        }),
      }
    );

    const verifyData = await verifyResponse.json();

    if (!verifyResponse.ok) {
      console.error('❌ [VERIFY] Verification failed:', JSON.stringify(verifyData));
      
      // Extract error message
      const errorMessage = verifyData.errors?.[0]?.message || 'Invalid verification code';
      
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('✅ [VERIFY] Email verified successfully');

    // Extract session token from response
    const sessionId = verifyData.response?.created_session_id;
    const userId = verifyData.response?.user_id;

    if (!sessionId || !userId) {
      console.error('❌ [VERIFY] No session created after verification');
      return NextResponse.json(
        { error: 'Verification succeeded but session creation failed' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Step 3: Get the session JWT token
    console.log('📧 [VERIFY] Step 3: Fetching session token...');
    const tokenResponse = await fetch(
      `${CLERK_FRONTEND_API}/v1/client/sessions/${sessionId}/tokens`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!tokenResponse.ok) {
      console.error('❌ [VERIFY] Failed to get session token');
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500, headers: corsHeaders }
      );
    }

    const tokenData = await tokenResponse.json();
    const token = tokenData.jwt;

    if (!token) {
      console.error('❌ [VERIFY] No JWT token in response');
      return NextResponse.json(
        { error: 'Failed to retrieve authentication token' },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('✅ [VERIFY] Session token retrieved successfully');
    console.log('✅ [VERIFY] Verification complete for user:', userId);

    return NextResponse.json(
      {
        success: true,
        token: token,
        userId: userId,
        email: email,
      },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('❌ [VERIFY] Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
