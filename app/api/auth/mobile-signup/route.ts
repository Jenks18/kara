import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';

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

    if (!email || !password || !username || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('📱 Sign-up request:', { email, username });

    // Create user with Backend SDK (bypasses CAPTCHA, auto-verifies email)
    const client = await clerkClient();
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
    
    // Try to create session directly with Backend SDK (like commit 3b8c80d)
    console.log('🔑 Attempting to create session with Backend SDK...');
    try {
      // @ts-ignore - Testing if this method exists
      const sessionToken: any = await client.sessions.createSession({
        userId: clerkUser.id,
      });
      
      const jwt = sessionToken?.lastActiveToken?.jwt;
      if (jwt) {
        console.log('✅ Session created with Backend SDK! Returning JWT.');
        return NextResponse.json(
          {
            success: true,
            userId: clerkUser.id,
            email: email,
            token: jwt,
            message: 'Account created and signed in successfully!'
          },
          { status: 200, headers: corsHeaders }
        );
      }
    } catch (sessionError: any) {
      console.error('⚠️ Backend SDK session creation failed:', sessionError.message);
      console.log('📝 Falling back to password authentication flow');
    }
    
    return NextResponse.json(
      {
        success: true,
        userId: clerkUser.id,
        email: email,
        message: 'Account created successfully. Signing you in...'
      },
      { status: 200, headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('❌ Sign-up error:', error.message);

    // Handle duplicate email/username
    if (error.errors?.[0]?.code === 'form_identifier_exists') {
      return NextResponse.json(
        { success: false, error: 'Email or username already exists.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Handle validation errors
    if (error.status === 422) {
      const errorMessage = error.errors?.[0]?.message || 'Invalid registration details';
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Sign-up failed' },
      { status: 500, headers: corsHeaders }
    );
  }
}
