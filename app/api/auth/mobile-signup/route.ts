import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { mintMobileSessionJwt } from '@/lib/auth/mobile-jwt';

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

    // Step 1: Create user with Backend SDK (bypasses CAPTCHA, auto-verifies email)
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

    // Step 2: Mint session JWT (backend is the sole authority)
    const sessionJwt = mintMobileSessionJwt(clerkUser.id, email);

    console.log('✅ Sign-up complete! userId:', clerkUser.id);

    return NextResponse.json(
      {
        success: true,
        userId: clerkUser.id,
        email: email,
        token: sessionJwt,
        message: 'Account created and authenticated!',
      },
      { status: 200, headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('❌ Sign-up error:', error.message);

    if (error.errors?.[0]?.code === 'form_identifier_exists') {
      return NextResponse.json(
        { success: false, error: 'Email or username already exists.' },
        { status: 400, headers: corsHeaders }
      );
    }

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
