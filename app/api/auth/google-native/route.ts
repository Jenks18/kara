import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { OAuth2Client } from 'google-auth-library';

/**
 * NATIVE Google OAuth for Android
 * 
 * Takes Google ID token from Android Credential Manager,
 * verifies it, creates/updates Clerk user, returns session JWT.
 * 
 * This is 100% native - no browser, no deep links.
 */

const googleClient = new OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '509785450495-ltsejjolpsl130pvs179lnqtms0g2uj8.apps.googleusercontent.com');

// CORS headers for mobile app
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();
    
    if (!idToken) {
      return NextResponse.json(
        { error: 'Missing ID token' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('Verifying Google ID token...');

    // Verify Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token payload' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { email, sub: googleId, name, picture } = payload;

    if (!email) {
      return NextResponse.json(
        { error: 'Email not found in token' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`Google auth successful for: ${email}`);

    // Find or create Clerk user
    const clerk = await clerkClient();
    
    // Try to find user by email
    let user;
    try {
      const users = await clerk.users.getUserList({ emailAddress: [email] });
      user = users.data[0];
    } catch (e) {
      console.log('User not found, will create new user');
    }

    if (!user) {
      // Create new Clerk user
      console.log(`Creating new Clerk user for ${email}`);
      user = await clerk.users.createUser({
        emailAddress: [email],
        firstName: name?.split(' ')[0],
        lastName: name?.split(' ').slice(1).join(' '),
        externalId: googleId,
        publicMetadata: {
          provider: 'google',
        },
      });
    }

    // Create session for the user
    console.log(`Creating session for user ${user.id}`);
    const session = await clerk.sessions.createSession({
      userId: user.id,
    });

    // Get session token (JWT)
    const sessionToken = await clerk.sessions.getToken(session.id, 'clerk-session');

    console.log('✅ Native auth successful');

    return NextResponse.json({
      success: true,
      sessionToken,
      user: {
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl,
      },
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Native auth error:', error);
    return NextResponse.json(
      { 
        error: 'Authentication failed',
        details: error.message,
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
