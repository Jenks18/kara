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

    console.log('✅ Clerk user created:', clerkUser.id);

    // Create user profile in Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: profile, error: profileError } = await supabase
      .rpc('create_user_profile', {
        p_clerk_user_id: clerkUser.id,
        p_email: email,
        p_full_name: `${firstName} ${lastName}`,
        p_username: username,
      });

    if (profileError) {
      console.error('❌ Profile creation error:', profileError);
      // Don't fail the sign-up if profile creation fails
      // User exists in Clerk, they can still log in
    } else {
      console.log('✅ Profile created in Supabase');
    }

    // Email is unverified by default - user needs to verify
    const primaryEmail = clerkUser.emailAddresses.find(e => e.id === clerkUser.primaryEmailAddressId);

    return NextResponse.json(
      {
        success: true,
        userId: clerkUser.id,
        email: email,
        emailVerified: primaryEmail?.verification?.status === 'verified',
        needsVerification: primaryEmail?.verification?.status !== 'verified',
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
