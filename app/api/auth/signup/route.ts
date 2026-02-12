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

    // Create user in Clerk - email is automatically verified by Backend SDK
    const client = await clerkClient();
    const user = await client.users.createUser({
      emailAddress: [email],
      password: password,
      username: username,
      firstName: firstName,
      lastName: lastName,
      publicMetadata: {
        auth_method: 'email_password',
      },
    });

    console.log('✅ User created in Clerk:', user.id);

    // Create sign-in token
    const signInToken = await client.signInTokens.createSignInToken({
      userId: user.id,
      expiresInSeconds: 86400, // 24 hours
    });

    console.log('✅ Sign-in token created');

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
        token: signInToken.token,
        userId: user.id,
        email: email,
        user: {
          id: user.id,
          email: email,
          firstName: firstName,
          lastName: lastName,
          username: username,
        },
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
