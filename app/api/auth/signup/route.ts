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

    // Create user in Clerk (unverified)
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
        email_verified: false,
      },
    });

    console.log('✅ User created in Clerk:', user.id);

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + (15 * 60 * 1000); // 15 minutes

    // Store code in user metadata
    await client.users.updateUser(user.id, {
      publicMetadata: {
        ...user.publicMetadata,
        verification_code: verificationCode,
        verification_expires: expiresAt,
      },
    });

    console.log(`📧 Verification code for ${email}: ${verificationCode}`);
    console.log('⚠️ TODO: Send this via email service (Resend/SendGrid)');

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
