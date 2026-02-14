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
 * Exchange sign-in token for JWT session (Backend Proxy)
 * Avoids Cloudflare blocking when Android calls Clerk directly
 */
export async function POST(request: NextRequest) {
  try {
    const { signInToken } = await request.json();

    if (!signInToken) {
      return NextResponse.json(
        { success: false, error: 'Sign-in token is required' },
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

    console.log('🔄 Exchanging sign-in token for JWT session...');

    // Exchange token via Clerk Frontend API
    const response = await fetch(`${frontendApi}/v1/tickets/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MafutaPass/1.0',
      },
      body: JSON.stringify({
        strategy: 'ticket',
        ticket: signInToken,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Token exchange failed:', response.status);
      return NextResponse.json(
        { success: false, error: 'Token exchange failed' },
        { status: response.status, headers: corsHeaders }
      );
    }

    const data = await response.json();
    const jwt = data?.client?.sessions?.[0]?.last_active_token?.jwt;
    const userId = data?.client?.sessions?.[0]?.user_id;

    if (!jwt) {
      console.error('❌ No JWT in response');
      return NextResponse.json(
        { success: false, error: 'No session token received' },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('✅ Token exchanged successfully! userId:', userId);

    return NextResponse.json({
      success: true,
      token: jwt,
      userId: userId,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('❌ Token exchange error:', error);
    return NextResponse.json(
      { success: false, error: 'Token exchange failed' },
      { status: 500, headers: corsHeaders }
    );
  }
}
