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
    const { signUpId, code } = await request.json();

    if (!signUpId || !code) {
      return NextResponse.json(
        { error: 'Missing signUpId or code' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`🔐 Verifying email code for sign-up: ${signUpId}`);

    // Step 1: Attempt verification using Frontend API
    const verifyResponse = await fetch(
      `https://api.clerk.com/v1/client/sign_ups/${signUpId}/attempt_verification`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${clerkPublishableKey}`,
        },
        body: JSON.stringify({
          strategy: 'email_code',
          code: code,
        }),
      }
    );

    if (!verifyResponse.ok) {
      const errorData = await verifyResponse.json();
      console.error('❌ Verification failed:', errorData);
      
      const errorMessage = errorData.errors?.[0]?.message || 'Invalid verification code';
      return NextResponse.json(
        { error: errorMessage },
        { status: 400, headers: corsHeaders }
      );
    }

    const verifyData = await verifyResponse.json();
    
    // Check if verification was successful and user was created
    if (verifyData.status !== 'complete' || !verifyData.created_user_id) {
      return NextResponse.json(
        { error: 'Verification incomplete. Please try again.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const userId = verifyData.created_user_id;
    console.log('✅ Email verified, user created:', userId);

    // Step 2: Get user details from Clerk Backend API
    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    // Step 3: Create user profile in Supabase
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: userId,
          first_name: user.firstName || '',
          last_name: user.lastName || '',
          display_name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || '',
          user_email: user.emailAddresses[0]?.emailAddress || '',
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

    // Step 4: Create sign-in token
    const signInToken = await client.signInTokens.createSignInToken({
      userId: userId,
      expiresInSeconds: 2592000, // 30 days
    });

    console.log('✅ Sign-in token created');

    return NextResponse.json(
      {
        success: true,
        token: signInToken.token,
        userId: userId,
        email: user.emailAddresses[0]?.emailAddress,
        message: 'Email verified successfully',
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Error verifying email:', error);
    
    return NextResponse.json(
      { error: 'Failed to verify email' },
      { status: 500, headers: corsHeaders }
    );
  }
}
