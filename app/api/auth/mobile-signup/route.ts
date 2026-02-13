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

    // Get the primary email address
    const primaryEmail = clerkUser.emailAddresses.find(e => e.id === clerkUser.primaryEmailAddressId);
    
    // Backend SDK doesn't automatically send verification emails
    // We need to trigger it by attempting a sign-in via Frontend API
    // This will cause Clerk to detect unverified email and send the code
    if (primaryEmail && primaryEmail.verification?.status !== 'verified') {
      try {
        console.log('📧 Triggering verification email by initiating sign-in...');
        
        // Call Clerk Frontend API to start sign-in (will trigger verification email)
        const signInResponse = await fetch(`${process.env.NEXT_PUBLIC_CLERK_FRONTEND_API || 'https://clerk.mafutapass.com'}/v1/client/sign_ins`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            identifier: email,
          }),
        });
        
        const signInData = await signInResponse.json();
        console.log('📧 Sign-in initiated, verification email triggered');
        
      } catch (emailError: any) {
        console.error('⚠️ Failed to trigger verification email:', emailError.message);
        // Continue anyway - user can trigger it by trying to sign in
      }
    }

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
