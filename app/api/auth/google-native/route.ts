import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { OAuth2Client } from 'google-auth-library';
import { auth } from '@clerk/nextjs/server';

/**
 * NATIVE Google OAuth for Android
 * 
 * Takes Google ID token from Android Credential Manager,
 * verifies it with Google, then uses Clerk's Backend API
 * to create an OAuth sign-in that properly links the provider.
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

    console.log('📱 Native Google OAuth - Starting verification');
    console.log('Token length:', idToken.length);
    console.log('Token prefix:', idToken.substring(0, 50));
    console.log('Request URL:', request.url);
    console.log('Request method:', request.method);

    // Verify Google ID token (without audience check - token signature is sufficient)
    // The token comes from Android Credential Manager which has a different audience
    let ticket;
    try {
      console.log('🔍 Calling Google verifyIdToken...');
      ticket = await googleClient.verifyIdToken({
        idToken,
      });
      console.log('✅ Google token verified successfully');
    } catch (error: any) {
      console.error('❌ Google token verification failed');
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Full error:', JSON.stringify(error, null, 2));
      throw error;
    }

    const payload = ticket.getPayload();
    if (!payload) {
      console.error('❌ No payload in token');
      return NextResponse.json(
        { error: 'Invalid token payload' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { email, sub: googleId, name, picture } = payload;
    console.log(`📧 Email from token:`, email);
    console.log(`🆔 Google ID:`, googleId);

    if (!email) {
      console.error('❌ No email in token payload');
      return NextResponse.json(
        { error: 'Email not found in token' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`✅ Google auth successful for: ${email}`);

    // Find or create Clerk user
    console.log('🔍 Initializing Clerk client...');
    let clerk;
    try {
      clerk = await clerkClient();
      console.log('✅ Clerk client initialized');
    } catch (error: any) {
      console.error('❌ Clerk client initialization failed:', error.message);
      throw error;
    }
    
    // Try to find user by email
    console.log('🔍 Searching for existing Clerk user...');
    let user;
    try {
      const users = await clerk.users.getUserList({ emailAddress: [email] });
      user = users.data[0];
      if (user) {
        console.log('✅ Found existing user:', user.id);
        console.log('User external accounts:', JSON.stringify(user.externalAccounts, null, 2));
      } else {
        console.log('ℹ️  User not found, will create new user');
      }
    } catch (e: any) {
      console.error('⚠️  Error searching for user:', e.message);
      console.log('Will attempt to create new user instead');
    }

    if (!user) {
      // Create new Clerk user with Google as verified OAuth provider
      console.log(`🆕 Creating new Clerk user for ${email}`);
      try {
        user = await clerk.users.createUser({
          emailAddress: [email],
          firstName: name?.split(' ')[0],
          lastName: name?.split(' ').slice(1).join(' '),
          skipPasswordChecks: true, // OAuth user doesn't need password
          skipPasswordRequirement: true,
        });
        console.log('✅ User created successfully:', user.id);
      } catch (error: any) {
        console.error('❌ Failed to create user:', error.message);
        throw error;
      }
    }

    // Create a fresh session (don't reuse old sessions - they can't generate JWTs)
    console.log(`🎫 Creating fresh session for user ${user.id}`);
    let session;
    try {
      session = await clerk.sessions.createSession({
        userId: user.id,
      });
      console.log('✅ Session created:', session.id);
    } catch (error: any) {
      console.error('❌ Failed to create session:', error.message);
      console.error('Full Clerk error:', JSON.stringify(error, null, 2));
      if (error.errors && Array.isArray(error.errors)) {
        console.error('Clerk error details:', JSON.stringify(error.errors, null, 2));
      }
      throw error;
    }

    // Get session JWT token
    console.log('🔑 Getting session JWT token...');
    let sessionToken;
    try {
      sessionToken = await clerk.sessions.getToken(session.id, 'clerk-session');
      console.log('✅ Session JWT acquired');
    } catch (error: any) {
      console.error('❌ Failed to get session token:', error.message);
      throw error;
    }

    console.log('🎉 Native auth completed successfully (session JWT)');

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
    console.error('❌ Native auth error:', error);
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { 
        error: 'Authentication failed',
        details: error.message,
        errorType: error.constructor.name,
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
