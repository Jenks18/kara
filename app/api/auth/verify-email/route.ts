import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';

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
        { error: 'Missing required fields' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`🔐 Verifying email for user: ${userId}`);

    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    // Check verification code from metadata
    const storedCode = user.publicMetadata.verification_code as string;
    const expiresAt = user.publicMetadata.verification_expires as number;

    if (!storedCode) {
      return NextResponse.json(
        { error: 'No verification code found. Please sign up again.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if code expired
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

    // Mark email as verified
    await client.users.updateUser(userId, {
      publicMetadata: {
        ...user.publicMetadata,
        email_verified: true,
        verification_code: undefined,
        verification_expires: undefined,
      },
    });

    console.log('✅ Email verified for user:', userId);

    // Create sign-in token
    const signInToken = await client.signInTokens.createSignInToken({
      userId: user.id,
      expiresInSeconds: 86400, // 24 hours
    });

    console.log('✅ Sign-in token created');

    return NextResponse.json(
      {
        success: true,
        token: signInToken.token,
        userId: user.id,
        email: user.emailAddresses[0]?.emailAddress || '',
        user: {
          id: user.id,
          email: user.emailAddresses[0]?.emailAddress || '',
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Error verifying email:', error);
    
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500, headers: corsHeaders }
    );
  }
}
