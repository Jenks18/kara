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
    const { userId, code } = await request.json();

    if (!userId || !code) {
      return NextResponse.json(
        { error: 'Missing userId or code' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`🔐 Verifying email code for user: ${userId}`);

    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    // Get verification code from metadata
    const storedCode = user.publicMetadata.verification_code as string;
    const expiresAt = user.publicMetadata.verification_expires as number;

    if (!storedCode || !expiresAt) {
      return NextResponse.json(
        { error: 'No verification code found. Please sign up again.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check expiration
    if (Date.now() > expiresAt) {
      return NextResponse.json(
        { error: 'Verification code expired. Please sign up again.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Verify code
    if (code !== storedCode) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('✅ Code verified for user:', userId);

    // Mark email as verified
    const emailAddress = user.emailAddresses[0];
    if (emailAddress && !emailAddress.verification?.status) {
      try {
        await client.emailAddresses.updateEmailAddress(emailAddress.id, {
          verified: true,
        });
      } catch (e) {
        console.log('Note: Email address verification update failed, continuing...');
      }
    }

    // Update metadata
    await client.users.updateUser(userId, {
      publicMetadata: {
        ...user.publicMetadata,
        email_verified: true,
        verification_code: undefined,
        verification_expires: undefined,
      },
    });

    // Create user profile in Supabase
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

    // Create sign-in token
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
