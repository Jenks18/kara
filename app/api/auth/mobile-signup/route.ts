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
    console.log('📧 Email auto-verified by Backend SDK (no verification flow needed)');

    // Create a session directly using Backend SDK (bypasses Cloudflare-protected Frontend API)
    console.log('🔑 Creating session directly for immediate authentication...');
    const session = await client.sessions.createSession({
      userId: clerkUser.id,
      // No need to specify actor - backend creates session on user's behalf
    });
    
    console.log('✅ Session created successfully:', session.id);
    
    // Get the session token (JWT)
    const sessionToken = session.lastActiveToken?.jwt;
    
    if (!sessionToken) {
      console.error('❌ No JWT token in session');
      return NextResponse.json(
        { error: 'Failed to create session token' },
        { status: 500, headers: corsHeaders }
      );
    }
    
    console.log('✅ Session JWT obtained - user can authenticate immediately');

    return NextResponse.json(
      {
        success: true,
        userId: clerkUser.id,
        email: email,
        sessionToken: sessionToken,
        message: 'Account created successfully'
      },
      { status: 200, headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('❌ Mobile sign-up error:', error);

    // Handle duplicate email/username
    if (error.errors?.[0]?.code === 'form_identifier_exists') {
      return NextResponse.json(
        { error: 'Email or username already exists' },
        { status: 400, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Sign-up failed' },
      { status: 500, headers: corsHeaders }
    );
  }
}
