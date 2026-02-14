import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import jwt from 'jsonwebtoken';

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
 * Verifies ticket with Clerk, then creates custom JWT
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

    console.log('🎫 Verifying sign-in ticket...');

    const client = await clerkClient();
    
    // Revoke (verify and consume) the sign-in token - this validates it
    let signInToken;
    try {
      signInToken = await client.signInTokens.revokeSignInToken(ticket);
    } catch (error: any) {
      console.error('❌ Failed to revoke ticket:', error.message);
      return NextResponse.json(
        { success: false, error: 'Invalid or expired sign-in ticket' },
        { status: 401, headers: corsHeaders }
      );
    }
    
    if (!signInToken || signInToken.status !== 'revoked') {
      console.error('❌ Invalid ticket status');
      return NextResponse.json(
        { success: false, error: 'Invalid sign-in ticket' },
        { status: 401, headers: corsHeaders }
      );
    }

    const userId = signInToken.userId;
    console.log('✅ Ticket verified for user:', userId);

    // Get the user
    const user = await client.users.getUser(userId);
    if (!user) {
      console.error('❌ User not found:', userId);
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Get user's email
    const email = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress;

    // Create a custom JWT with user information
    // This will be used for authenticating subsequent API calls
    const jwtSecret = process.env.CLERK_SECRET_KEY;  // Re-use Clerk secret for signing
    if (!jwtSecret) {
      console.error('❌ JWT secret not configured');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500, headers: corsHeaders }
      );
    }

    const token = jwt.sign(
      {
        sub: userId,
        email: email,
        type: 'session',
        iss: 'mafutapass',
      },
      jwtSecret,
      { expiresIn: '24h' }
    );

    console.log('✅ Session token created successfully');

    return NextResponse.json({
      success: true,
      token: token,
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
