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

    // Create user in Clerk - mark as unverified initially
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
        email_verified: false, // Track verification in metadata
      },
    });

    console.log('✅ User created in Clerk:', user.id);

    // Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store verification code in Clerk's public metadata (expires in 15 minutes)
    await client.users.updateUser(user.id, {
      publicMetadata: {
        ...user.publicMetadata,
        verification_code: verificationCode,
        verification_expires: Date.now() + (15 * 60 * 1000), // 15 minutes
      },
    });

    console.log('✅ Verification code generated');

    // TODO: Send verification email (using Resend, SendGrid, or another service)
    // For now, log it (in production, you'd send an actual email)
    console.log(`📧 Verification code for ${email}: ${verificationCode}`);

    // Auto-create user profile in Supabase (but mark as unverified)
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
        message: 'Verification code sent to your email',
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
