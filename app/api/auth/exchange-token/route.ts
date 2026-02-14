import { NextRequest, NextResponse } from 'next/server';

/**
 * Exchange a sign-in token for a Clerk session (Backend Proxy)
 * 
 * This endpoint proxies the token exchange request to avoid Cloudflare blocking.
 * When Android apps call Clerk's Frontend API directly, Cloudflare flags them as bots.
 * By routing through our backend, the request comes from Vercel (trusted).
 */
export async function POST(request: NextRequest) {
  try {
    const { signInToken } = await request.json();

    if (!signInToken) {
      return NextResponse.json(
        { success: false, error: 'Sign-in token is required' },
        { status: 400 }
      );
    }

    const frontendApi = process.env.NEXT_PUBLIC_CLERK_FRONTEND_API;
    if (!frontendApi) {
      console.error('❌ NEXT_PUBLIC_CLERK_FRONTEND_API not configured');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    console.log('🔄 Calling Clerk Frontend API:', `${frontendApi}/v1/tickets/accept`);
    console.log('🎫 Token (first 50 chars):', signInToken.substring(0, 50) + '...');

    // Call Clerk's Frontend API to exchange token for session
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
      console.error('❌ Token exchange failed:', response.status, errorText);
      console.error('❌ Request details:', {
        url: `${frontendApi}/v1/tickets/accept`,
        token: signInToken.substring(0, 50) + '...',
        responseStatus: response.status,
        responseHeaders: Object.fromEntries(response.headers.entries())
      });
      return NextResponse.json(
        { success: false, error: 'Token exchange failed', details: errorText.substring(0, 200) },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Extract JWT from response
    const jwt = data?.client?.sessions?.[0]?.last_active_token?.jwt;
    const userId = data?.client?.sessions?.[0]?.user_id;

    if (!jwt) {
      console.error('❌ No JWT in response:', JSON.stringify(data));
      return NextResponse.json(
        { success: false, error: 'No session token received' },
        { status: 500 }
      );
    }

    console.log('✅ Token exchange successful! userId:', userId);

    return NextResponse.json({
      success: true,
      token: jwt,
      userId: userId,
    });

  } catch (error) {
    console.error('❌ Token exchange error:', error);
    return NextResponse.json(
      { success: false, error: 'Token exchange failed' },
      { status: 500 }
    );
  }
}
