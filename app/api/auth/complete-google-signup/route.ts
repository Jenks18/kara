import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  console.log('🔐 Complete Google OAuth sign-up');

  try {
    const { pendingSignupToken, username } = await request.json();

    if (!pendingSignupToken || !username) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`📝 Completing signup with username: ${username}`);

    // Verify the pending signup token
    const jwt = await import('jsonwebtoken');
    const secretKey = process.env.CLERK_SECRET_KEY;
    
    if (!secretKey) {
      console.error('❌ CLERK_SECRET_KEY not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500, headers: corsHeaders }
      );
    }

    let pendingSignup: any;
    try {
      pendingSignup = jwt.verify(pendingSignupToken, secretKey, { algorithms: ['HS256'] });
    } catch (error: any) {
      console.error('❌ Invalid or expired token:', error.message);
      return NextResponse.json(
        { error: 'Invalid or expired signup token. Please sign in with Google again.' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { email, googleId, firstName, lastName } = pendingSignup;
    console.log(`✅ Token verified for: ${email}`);

    // Check if user already exists (race condition check)
    const clerk = await clerkClient();
    const existingUsers = await clerk.users.getUserList({ emailAddress: [email] });
    
    if (existingUsers.data.length > 0) {
      console.log('⚠️  User already exists - returning existing user');
      const user = existingUsers.data[0];
      
      const signInToken = await clerk.signInTokens.createSignInToken({
        userId: user.id,
        expiresInSeconds: 86400,
      });
      
      return NextResponse.json({
        success: true,
        token: signInToken.token,
        userId: user.id,
        email: email,
        isNewUser: false,
        user: {
          id: user.id,
          email: email,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
        },
      }, { headers: corsHeaders });
    }

    // Create Clerk user with chosen username
    console.log(`🆕 Creating Clerk user with username: ${username}`);
    
    const crypto = await import('crypto');
    const randomPassword = crypto.randomBytes(32).toString('hex');
    
    const user = await clerk.users.createUser({
      emailAddress: [email],
      password: randomPassword, // Random password for OAuth users
      username: username,
      firstName: firstName,
      lastName: lastName || undefined,
      publicMetadata: {
        oauth_provider: 'google',
        google_id: googleId,
        auth_method: 'google_oauth',
      },
    });

    console.log('✅ User created in Clerk:', user.id);

    // Create sign-in token
    const signInToken = await clerk.signInTokens.createSignInToken({
      userId: user.id,
      expiresInSeconds: 86400, // 24 hours
    });

    console.log('✅ Sign-in token created');

    // Auto-create user profile in Supabase
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: user.id,
          first_name: firstName,
          last_name: lastName || '',
          display_name: `${firstName} ${lastName || ''}`.trim(),
          user_email: email,
          updated_at: new Date().toISOString(),
        });

      if (profileError) {
        console.error('⚠️ Failed to create profile:', profileError);
      } else {
        console.log('✅ User profile created in Supabase');
      }
    } catch (profileErr) {
      console.error('⚠️ Error creating profile:', profileErr);
    }

    console.log('🎉 Google OAuth signup completed successfully');

    return NextResponse.json({
      success: true,
      token: signInToken.token,
      userId: user.id,
      email: email,
      isNewUser: true,
      user: {
        id: user.id,
        email: email,
        firstName: firstName,
        lastName: lastName || '',
        username: username,
      },
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('❌ Error completing signup:', error);
    
    // Check for Clerk-specific errors
    let errorMessage = 'Failed to complete signup';
    if (error.errors && Array.isArray(error.errors)) {
      const firstError = error.errors[0];
      if (firstError.message) {
        errorMessage = firstError.message;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage, details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
