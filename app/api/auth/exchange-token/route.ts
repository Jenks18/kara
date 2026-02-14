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
 * Exchange sign-in token (ticket) for session JWT
 * Uses Clerk's ticket strategy via Frontend API
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

    console.log('🎫 Exchanging ticket for session...');

    const frontendApi = process.env.NEXT_PUBLIC_CLERK_FRONTEND_API;
    if (!frontendApi) {
      console.error('❌ NEXT_PUBLIC_CLERK_FRONTEND_API not configured');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Use ticket strategy to sign in
    // This is the proper Clerk approach for programmatic authentication
    const signInResponse = await fetch(`${frontendApi}/v1/client/sign_ins?_clerk_js_version=4.70.0`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        strategy: 'ticket',
        ticket: ticket,
      }),
    });

    if (!signInResponse.ok) {
      console.error('❌ Ticket authentication failed:', signInResponse.status);
      const errorText = await signInResponse.text();
      console.error('Error response:', errorText);
      return NextResponse.json(
        { success: false, error: 'Authentication failed' },
        { status: 401, headers: corsHeaders }
      );
    }

    const signInData = await signInResponse.json();
    
    // Extract JWT and userId from response
    const jwt = signInData.client?.sessions?.[0]?.last_active_token?.jwt;
    const userId = signInData.response?.user_id;

    if (!jwt) {
      console.error('❌ No JWT token received');
      console.log('Response structure:', JSON.stringify(signInData, null, 2));
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
