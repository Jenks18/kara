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
 * Exchange sign-in token (ticket) for Clerk session JWT.
 * Uses a SINGLE Frontend API call — no multi-step cookie management needed.
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

    // Single-step ticket exchange: strategy + ticket in ONE call
    // The ticket contains all auth context — no second step or cookies needed
    const signInResponse = await fetch(`${frontendApi}/v1/client/sign_ins?_clerk_js_version=4.70.0`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        strategy: 'ticket',
        ticket: ticket,
      }),
    });

    if (!signInResponse.ok) {
      const errorText = await signInResponse.text();
      console.error('❌ Ticket exchange failed:', signInResponse.status, errorText);
      return NextResponse.json(
        { success: false, error: 'Ticket authentication failed' },
        { status: signInResponse.status, headers: corsHeaders }
      );
    }

    const signInData = await signInResponse.json();

    // Extract JWT and userId from the completed sign-in
    const jwt = signInData.client?.sessions?.[0]?.last_active_token?.jwt;
    const userId = signInData.response?.user_id;

    if (!jwt) {
      console.error('❌ No JWT in response. Full response:', JSON.stringify(signInData, null, 2));
      return NextResponse.json(
        { success: false, error: 'Authentication failed - no session created' },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('✅ Clerk session established! userId:', userId);

    return NextResponse.json({
      success: true,
      token: jwt,
      userId: userId || '',
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('❌ Token exchange error:', error.message);
    return NextResponse.json(
      { success: false, error: 'Token exchange failed' },
      { status: 500, headers: corsHeaders }
    );
  }
}
