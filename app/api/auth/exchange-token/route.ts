import { NextRequest, NextResponse } from 'next/server';
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
 * Exchange sign-in token (ticket) for Clerk session JWT.
 * Initializes a Clerk client, then exchanges the ticket.
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

    const session = await exchangeSignInTokenForJwt(ticket);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Ticket authentication failed' },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('✅ Clerk session established! userId:', session.userId);

    return NextResponse.json({
      success: true,
      token: session.jwt,
      userId: session.userId,
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('❌ Token exchange error:', error.message);
    return NextResponse.json(
      { success: false, error: 'Token exchange failed' },
      { status: 500, headers: corsHeaders }
    );
  }
}
