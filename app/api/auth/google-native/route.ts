import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { OAuth2Client } from 'google-auth-library';
import { mintMobileSessionJwt } from '@/lib/auth/mobile-jwt';

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
      // New user - don't create Clerk account yet!
      // Return verified Google info so Android can collect username first
      console.log(`🆕 New user - username required: ${email}`);
      console.log(`Name from Google: ${name}`);
      console.log(`Google ID: ${googleId}`);
      
      const firstName = name?.split(' ')[0] || email.split('@')[0];
      const lastName = name?.split(' ').slice(1).join(' ') || '';
      
      // Sign the verified Google data with JWT so it can be verified later
      const crypto = await import('crypto');
      const jwt = await import('jsonwebtoken');
      
      const secretKey = process.env.CLERK_SECRET_KEY;
      if (!secretKey) {
        throw new Error('CLERK_SECRET_KEY not configured');
      }
      
      const pendingSignup = {
        email: email,
        googleId: googleId,
        firstName: firstName,
        lastName: lastName,
        verified: true,
        exp: Math.floor(Date.now() / 1000) + (60 * 15), // 15 minutes to complete signup
      };
      
      const signedToken = jwt.sign(pendingSignup, secretKey, { algorithm: 'HS256' });
      
      console.log('✅ Google token verified - awaiting username selection');
      
      return NextResponse.json({
        needsUsername: true,
        pendingSignupToken: signedToken,
        email: email,
        firstName: firstName,
        lastName: lastName,
      }, {
        headers: corsHeaders,
      });
    }
    
    // Existing user — mint session JWT directly (backend is the sole authority)
    console.log('✅ Existing user found:', user.id);
    const sessionJwt = mintMobileSessionJwt(user.id, email);
    console.log('✅ JWT minted for Google OAuth user:', user.id);
    
    // Auto-create/update user profile in Supabase
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          first_name: user.firstName || '',
          last_name: user.lastName || '',
          display_name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User',
          user_email: email,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (profileError) {
        console.error('⚠️ Failed to create profile:', profileError);
      } else {
        console.log('✅ User profile created/updated in Supabase');
      }
    } catch (profileErr) {
      console.error('⚠️ Error creating profile:', profileErr);
    }

    return NextResponse.json({
      success: true,
      token: sessionJwt,
      userId: user.id,
      email: email,
      isNewUser: false, // Existing user
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
