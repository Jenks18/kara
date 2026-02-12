import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!;

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
    const { username, email, password, firstName, lastName } = await request.json();

    if (!username || !email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`📝 Creating sign-up via Frontend API: ${email}, username: ${username}`);

    // Step 1: Create sign_up using Clerk's Frontend API
    const signUpResponse = await fetch('https://api.clerk.com/v1/client/sign_ups', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clerkPublishableKey}`,
      },
      body: JSON.stringify({
        email_address: email,
        password: password,
        username: username,
        first_name: firstName,
        last_name: lastName,
      }),
    });

    if (!signUpResponse.ok) {
      const errorData = await signUpResponse.json();
      console.error('❌ Frontend API sign-up failed:', errorData);
      throw new Error(errorData.errors?.[0]?.message || 'Sign up failed');
    }

    const signUpData = await signUpResponse.json();
    const signUpId = signUpData.id;
    
    console.log('✅ Sign-up created:', signUpId);

    // Step 2: Prepare email verification (triggers Clerk to send email)
    const verificationResponse = await fetch(
      `https://api.clerk.com/v1/client/sign_ups/${signUpId}/prepare_verification`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${clerkPublishableKey}`,
        },
        body: JSON.stringify({
          strategy: 'email_code',
        }),
      }
    );

    if (!verificationResponse.ok) {
      const errorData = await verificationResponse.json();
      console.error('❌ Failed to prepare verification:', errorData);
      throw new Error('Failed to send verification email');
    }

    console.log('📧 Verification email sent via Clerk');

    return NextResponse.json(
      {
        success: true,
        needsVerification: true,
        signUpId: signUpId,
        email: email,
        message: 'Verification code sent to your email',
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Error creating sign-up:', error);
    
    // Check for specific Clerk errors
    let errorMessage = 'Sign up failed';
    if (error.errors && Array.isArray(error.errors)) {
      const firstError = error.errors[0];
      if (firstError.message) {
        errorMessage = firstError.message;
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500, headers: corsHeaders }
    );
  }
}
