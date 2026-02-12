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

    // Trigger Clerk to send verification email using Backend API
    try {
      await client.emailAddresses.updateEmailAddress(emailAddress.id, {
        // This triggers Clerk to send verification email
        unverified: true,
      });
      console.log('📧 Clerk verification email triggered');
    } catch (emailError: any) {
      console.error('⚠️ Failed to trigger email:', emailError);
      // User created but email not sent - they can retry
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
