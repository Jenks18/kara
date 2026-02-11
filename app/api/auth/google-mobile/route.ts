import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { OAuth2Client } from 'google-auth-library';

const googleClient = new OAuth2Client(
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
);

/**
 * Mobile Google OAuth endpoint
 * Accepts Google ID token from Android/iOS app and creates/authenticates Clerk user
 */
export async function POST(request: NextRequest) {
  try {
    const { idToken, email, firstName, lastName } = await request.json();
    
    if (!idToken || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Verify the Google ID token
    let googlePayload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      });
      googlePayload = ticket.getPayload();
      
      // Verify email matches
      if (googlePayload?.email !== email) {
        return NextResponse.json(
          { error: 'Email mismatch' },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error('Google token verification failed:', error);
      return NextResponse.json(
        { error: 'Invalid Google token' },
        { status: 401 }
      );
    }
    
    // Find or create user in Clerk
    const clerk = await clerkClient();
    
    // Try to find existing user by email
    const users = await clerk.users.getUserList({
      emailAddress: [email],
    });
    
    let userId: string;
    
    if (users.data.length > 0) {
      // User exists
      userId = users.data[0].id;
      console.log('Found existing user:', userId);
    } else {
      // Create new user
      const newUser = await clerk.users.createUser({
        emailAddress: [email],
        firstName: firstName || googlePayload?.given_name || '',
        lastName: lastName || googlePayload?.family_name || '',
        skipPasswordRequirement: true,
        skipPasswordChecks: true,
      });
      userId = newUser.id;
      console.log('Created new user:', userId);
    }
    
    // Create a session token for this user
    // Note: Clerk doesn't provide direct session token creation via API
    // Instead, we'll return the user ID and let the mobile app use Clerk SDK's signIn
    
    return NextResponse.json({
      success: true,
      userId,
      email,
      message: 'User authenticated successfully',
    });
    
  } catch (error) {
    console.error('Mobile Google OAuth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
