import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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

    console.log(`📝 Creating user: ${email}, username: ${username}`);

    // Create user in Clerk with unverified email
    const client = await clerkClient();
    const user = await client.users.createUser({
      emailAddress: [email],
      password: password,
      username: username,
      firstName: firstName,
      lastName: lastName,
      skipPasswordChecks: false,
      skipPasswordRequirement: false,
      publicMetadata: {
        auth_method: 'email_password',
      },
    });

    console.log('✅ User created in Clerk:', user.id);

    // Get the email address object
    const emailAddress = user.emailAddresses.find(e => e.emailAddress === email);
    
    if (!emailAddress) {
      throw new Error('Email address not found in user object');
    }

    console.log('📧 Email address ID:', emailAddress.id);

    // Mark email as verified (Clerk's backend API doesn't send verification emails automatically)
    // For production: integrate Clerk's frontend SDK or use custom email service
    console.log('✅ Marking email as verified for native mobile app');
    try {
      await client.emailAddresses.updateEmailAddress(emailAddress.id, {
        verified: true,
      });
    } catch (updateError: any) {
      console.error('⚠️ Failed to verify email:', updateError);
      // Continue anyway - user can verify later
    }

    // Auto-create user profile in Supabase
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: user.id,
          first_name: firstName,
          last_name: lastName,
          display_name: `${firstName} ${lastName}`.trim(),
          user_email: email,
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

    // Create sign-in token for immediate login
    const signInToken = await client.signInTokens.createSignInToken({
      userId: user.id,
    });

    console.log('✅ Sign-in token created');

    return NextResponse.json(
      {
        success: true,
        token: signInToken.token,
        userId: user.id,
        email: email,
        message: 'Account created successfully',
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Error creating user:', error);
    
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
