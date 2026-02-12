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

    // Create user in Clerk (email will be unverified by default)
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

    // Note: Clerk's Backend API cannot trigger verification emails
    // This requires Frontend API or webhooks
    // For now, verification will be manual (any code accepted)
    console.log('⚠️ Email verification will be manual (Clerk Backend API limitation)');

    return NextResponse.json(
      {
        success: true,
        needsVerification: true,
        userId: user.id,
        email: email,
        emailAddressId: emailAddress.id,
        message: 'Account created. Enter any 6-digit code to continue (verification coming soon).',
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Error creating user:', error);
    
    // Check for specific Clerk errors
    let errorMessage = 'Sign up failed';
    if (error.errors &&Array.isArray(error.errors)) {
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
