import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, username, firstName, lastName } = await req.json();

    console.log('📱 Mobile sign-up request:', { email, username, firstName, lastName });

    if (!email || !password || !username || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Create user in Clerk using Backend API (no CAPTCHA required)
    // Backend SDK auto-verifies emails, but we'll use metadata to force verification
    const client = await clerkClient();
    
    console.log('📱 Creating user with Backend SDK (bypasses CAPTCHA)...');
    const clerkUser = await client.users.createUser({
      emailAddress: [email],
      password: password,
      username: username,
      firstName: firstName,
      lastName: lastName,
      skipPasswordChecks: false,
      skipPasswordRequirement: false,
    });

    console.log('✅ User created:', clerkUser.id);
    console.log('📧 Email auto-verified by Backend SDK');
    
    // Automatically create a sign-in token for immediate authentication
    console.log('🔐 Creating sign-in token for automatic authentication...');
    const signInToken = await client.signInTokens.createSignInToken({
      userId: clerkUser.id,
      expiresInSeconds: 3600, // 1 hour
    });
    
    console.log('✅ Sign-in token created:', signInToken.id);
    console.log('🎟️ Token:', signInToken.token);
    
    // Return the sign-in token - Android will exchange it for a session
    return NextResponse.json(
      {
        success: true,
        userId: clerkUser.id,
        email: email,
        token: signInToken.token, // Sign-in token for automatic authentication
        message: 'Account created successfully and authenticated.'
      },
      { status: 200, headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('❌ Mobile sign-up error:', error);
    console.error('❌ Error details:', JSON.stringify({
      message: error.message,
      code: error.code,
      status: error.status,
      errors: error.errors,
      clerkTraceId: error.clerkTraceId
    }, null, 2));

    // Handle duplicate email/username
    if (error.errors?.[0]?.code === 'form_identifier_exists') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Email or username already exists. Please use a different email.' 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Handle other validation errors
    if (error.status === 422 || error.code === 'api_response_error') {
      const errorMessage = error.errors?.[0]?.message || error.errors?.[0]?.longMessage || 'Invalid registration details';
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Sign-up failed' },
      { status: 500, headers: corsHeaders }
    );
  }
}
