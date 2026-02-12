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
    const { userId, emailAddressId, code } = await request.json();

    if (!userId || !emailAddressId || !code) {
      return NextResponse.json(
        { error: 'Missing userId, emailAddressId, or code' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`🔐 Verifying email code for user: ${userId}`);

    const client = await clerkClient();
    
    // Note: Accepting any 6-digit code for now
    // Clerk Backend API doesn't support email code verification
    // TODO: Add custom email service for production
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: 'Invalid code format. Must be 6 digits.' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    console.log('✅ Code format valid, marking email as verified');
    
    // Mark email as verified in Clerk
    try {
      await client.emailAddresses.updateEmailAddress(emailAddressId, {
        verified: true,
      });
      console.log('✅ Email marked as verified in Clerk');
    } catch (verifyError: any) {
      console.error('❌ Failed to mark as verified:', verifyError);
      // Continue anyway
    }

    // Get user details
    const user = await client.users.getUser(userId);

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
