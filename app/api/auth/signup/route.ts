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

    // Trigger Clerk's email verification
    console.log('📧 Sending verification email via Clerk...');
    await client.emailAddresses.createEmailAddress({
      userId: user.id,
    });

    // The email address is created but unverified - Clerk will send verification email

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

    return NextResponse.json(
      {
        success: true,
        needsVerification: true,
        userId: user.id,
        email: email,
        emailAddressId: emailAddress.id,
        message: 'Verification email sent. Please check your inbox.',
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
