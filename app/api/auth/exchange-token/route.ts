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
 * Exchange sign-in token (ticket) for Clerk session JWT
 * Uses Frontend API with proper cookie handling for session state
 */
export async function POST(request: NextRequest) {
  try {
    const { ticket } = await request.json();

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Sign-in ticket is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('🎫 Exchanging ticket for Clerk session...');

    const frontendApi = process.env.NEXT_PUBLIC_CLERK_FRONTEND_API;
    if (!frontendApi) {
      console.error('❌ NEXT_PUBLIC_CLERK_FRONTEND_API not configured');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Step 1: Create sign-in attempt - capture cookies for session state
    const createSignInResponse = await fetch(`${frontendApi}/v1/client/sign_ins?_clerk_js_version=4.70.0`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        strategy: 'ticket',
      }),
    });

    if (!createSignInResponse.ok) {
      console.error('❌ Failed to create sign-in:', createSignInResponse.status);
      const errorText = await createSignInResponse.text();
      console.error('Error response:', errorText);
      return NextResponse.json(
        { success: false, error: 'Failed to initiate sign-in' },
        { status: createSignInResponse.status, headers: corsHeaders }
      );
    }

    // Extract cookies from the first request to maintain session state
    const cookies = createSignInResponse.headers.get('set-cookie');
    
    const createData = await createSignInResponse.json();
    const signInId = createData.response?.id;

    if (!signInId) {
      console.error('❌ No sign-in ID received');
      return NextResponse.json(
        { success: false, error: 'Failed to create sign-in' },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('✅ Sign-in created:', signInId);

    // Step 2: Attempt first factor with ticket - include cookies for session continuity
    const attemptHeaders: HeadersInit = { 
      'Content-Type': 'application/json',
    };
    
    // Pass cookies to maintain session state
    if (cookies) {
      attemptHeaders['Cookie'] = cookies.split(',').map(c => c.split(';')[0]).join('; ');
    }

    const attemptResponse = await fetch(
      `${frontendApi}/v1/client/sign_ins/${signInId}/attempt_first_factor?_clerk_js_version=4.70.0`,
      {
        method: 'POST',
        headers: attemptHeaders,
        body: JSON.stringify({ 
          strategy: 'ticket',
          ticket: ticket,
        }),
      }
    );

    if (!attemptResponse.ok) {
      console.error('❌ Ticket attempt failed:', attemptResponse.status);
      const errorText = await attemptResponse.text();
      console.error('Error response:', errorText);
      return NextResponse.json(
        { success: false, error: 'Ticket authentication failed' },
        { status: attemptResponse.status, headers: corsHeaders }
      );
    }

    const signInData = await attemptResponse.json();
    
    // Extract Clerk's official JWT and userId from response
    const jwt = signInData.client?.sessions?.[0]?.last_active_token?.jwt;
    const userId = signInData.response?.user_id;

    if (!jwt) {
      console.error('❌ No JWT token received from Clerk');
      console.log('Response structure:', JSON.stringify(signInData, null, 2));
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

    console.log('✅ Clerk session established! userId:', userId);

    return NextResponse.json({
      success: true,
      token: jwt, // This is Clerk's official JWT - production-grade
      userId: userId,
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('❌ Token exchange error:', error.message);
    console.error('Error details:', error);
    return NextResponse.json(
      { success: false, error: 'Token exchange failed' },
      { status: 500, headers: corsHeaders }
    );
  }
}
