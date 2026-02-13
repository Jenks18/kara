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
      // Mark that this user was created via backend and needs verification
      // We'll check this metadata in sign-in to force verification
      unsafeMetadata: {
        needsEmailVerification: true,
        createdViaBackend: true,
      },
    });

    console.log('✅ Clerk user created:', clerkUser.id);
    console.log('📧 Email addresses:', JSON.stringify(clerkUser.emailAddresses, null, 2));

    // Get the primary email address
    const primaryEmail = clerkUser.emailAddresses.find(e => e.id === clerkUser.primaryEmailAddressId);
    
    console.log('📧 Primary email verification status after creation:', primaryEmail?.verification?.status);
    
    // Step 1: Unverify the email address (Backend SDK auto-verifies it)
    try {
      if (primaryEmail) {
        console.log('📧 Unverifying email address to force verification flow...');
        
        // Use Backend SDK to update email address status to unverified
        await client.emailAddresses.updateEmailAddress(primaryEmail.id, {
          verified: false,
        });
        
        console.log('✅ Email marked as unverified');
      }
    } catch (unverifyError: any) {
      console.error('⚠️ Failed to unverify email:', unverifyError.message);
    }
    
    // Step 2: ALWAYS trigger verification email via Frontend API
    // Even if Backend SDK marked it as verified, we want user to verify
    try {
      console.log('📧 Triggering verification email via Frontend API...');
      
      // Start sign-in
      const signInResponse = await fetch(`${process.env.NEXT_PUBLIC_CLERK_FRONTEND_API || 'https://clerk.mafutapass.com'}/v1/client/sign_ins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: email,
        }),
      });
      
      if (!signInResponse.ok) {
        console.error('⚠️ Failed to start sign-in:', await signInResponse.text());
        throw new Error('Failed to start sign-in');
      }
      
      const signInData = await signInResponse.json();
      const signInId = signInData.response?.id;
      
      console.log('📧 Sign-in initiated, ID:', signInId);
      
      // Prepare email verification (this sends the code)
      if (signInId) {
        const prepareResponse = await fetch(`${process.env.NEXT_PUBLIC_CLERK_FRONTEND_API || 'https://clerk.mafutapass.com'}/v1/client/sign_ins/${signInId}/prepare_first_factor`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            strategy: 'email_code',
            email_address_id: primaryEmail?.id,
          }),
        });
        
        if (prepareResponse.ok) {
          console.log('✅ Verification email sent successfully');
        } else {
          const errorText = await prepareResponse.text();
          console.error('⚠️ Failed to prepare email verification:', errorText);
        }
      }
      
    } catch (emailError: any) {
      console.error('⚠️ Failed to trigger verification email:', emailError.message);
      // Continue anyway - user can trigger it by trying to sign in
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
        // Backend SDK users always need verification via sign-in
        // Email verification happens through the sign-in flow
        needsVerification: true,
        message: 'Account created. Please check your email for verification code when signing in.'
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
