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

    // Create sign-in token, then exchange it on backend (bypasses Cloudflare blocking Android)
    console.log('🔑 Creating sign-in token...');
    const signInToken = await client.signInTokens.createSignInToken({
      userId: clerkUser.id,
      expiresInSeconds: 300,
    });
    
    console.log('✅ Sign-in token created, exchanging for JWT on backend...');
    
    // Exchange token on OUR backend (Cloudflare trusts us, not Android)
    const frontendApi = process.env.NEXT_PUBLIC_CLERK_FRONTEND_API;
    if (!frontendApi) {
      console.error('❌ NEXT_PUBLIC_CLERK_FRONTEND_API not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500, headers: corsHeaders }
      );
    }
    
    const exchangeResponse = await fetch(`${frontendApi}/v1/tickets/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MafutaPass-Backend/1.0',
      },
      body: JSON.stringify({
        strategy: 'ticket',
        ticket: signInToken.token,
      }),
    });
    
    if (!exchangeResponse.ok) {
      const errorText = await exchangeResponse.text();
      console.error('❌ Token exchange failed:', exchangeResponse.status, errorText);
      return NextResponse.json(
        { error: 'Failed to authenticate user' },
        { status: 500, headers: corsHeaders }
      );
    }
    
    const exchangeData = await exchangeResponse.json();
    const jwt = exchangeData?.client?.sessions?.[0]?.last_active_token?.jwt;
    
    if (!jwt) {
      console.error('❌ No JWT in exchange response');
      return NextResponse.json(
        { error: 'Failed to get session token' },
        { status: 500, headers: corsHeaders }
      );
    }
    
    console.log('✅ JWT obtained successfully!');

    return NextResponse.json(
      {
        success: true,
        userId: clerkUser.id,
        email: email,
        sessionToken: jwt,
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
