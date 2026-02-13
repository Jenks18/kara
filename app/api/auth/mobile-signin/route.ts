import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    console.log('📱 Mobile sign-in request:', { email });

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Missing email or password' },
        { status: 400, headers: corsHeaders }
      );
    }

    const client = await clerkClient();
    
    // Get user by email
    const users = await client.users.getUserList({ emailAddress: [email] });
    
    if (!users.data || users.data.length === 0) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401, headers: corsHeaders }
      );
    }

    const user = users.data[0];
    
    // Check if email is verified
    const primaryEmail = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId);
    
    if (primaryEmail && primaryEmail.verification?.status !== 'verified') {
      console.log('📧 Email not verified, triggering verification email...');
      
      // Trigger verification email by calling Frontend API
      try {
        const frontendAPI = process.env.NEXT_PUBLIC_CLERK_FRONTEND_API || 'https://clerk.mafutapass.com';
        
        const signInResponse = await fetch(`${frontendAPI}/v1/client/sign_ins`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            identifier: email,
          }),
        });
        
        if (signInResponse.ok) {
          console.log('✅ Verification email triggered');
        } else {
          console.warn('⚠️ Failed to trigger verification email');
        }
      } catch (emailError: any) {
        console.error('⚠️ Error triggering verification email:', emailError.message);
      }
      
      return NextResponse.json(
        {
          success: false,
          needsVerification: true,
          userId: user.id,
          message: 'Email verification required. Check your inbox for verification code.'
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // Email is verified, verify password and create session token
    // Note: Clerk Backend SDK doesn't have password verification
    // We need to use the Frontend API for this part
    const frontendAPI = process.env.NEXT_PUBLIC_CLERK_FRONTEND_API || 'https://clerk.mafutapass.com';
    
    // Step 1: Create sign-in
    const signInResponse = await fetch(`${frontendAPI}/v1/client/sign_ins`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identifier: email,
      }),
    });

    if (!signInResponse.ok) {
      throw new Error('Failed to initiate sign-in');
    }

    const signInData = await signInResponse.json();
    const signInId = signInData.response?.sign_in?.id;

    if (!signInId) {
      throw new Error('Invalid sign-in response');
    }

    // Extract cookies
    const cookies = signInResponse.headers.getSetCookie();
    const cookieHeader = cookies.map(c => c.split(';')[0]).join('; ');

    // Step 2: Attempt password
    const attemptResponse = await fetch(`${frontendAPI}/v1/client/sign_ins/${signInId}/attempt_first_factor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
      body: JSON.stringify({
        strategy: 'password',
        password: password,
      }),
    });

    const attemptData = await attemptResponse.json();

    if (!attemptResponse.ok) {
      console.error('❌ Password attempt failed:', attemptData);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Check if session was created
    const sessionId = attemptData.response?.created_session_id || 
                      attemptData.client?.sign_in?.created_session_id;

    if (!sessionId) {
      console.error('❌ No session created:', attemptData);
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Get session token
    const session = attemptData.client?.sessions?.find((s: any) => s.id === sessionId);
    const sessionToken = session?.last_active_token?.jwt;

    if (!sessionToken) {
      console.error('❌ No session token found');
      return NextResponse.json(
        { error: 'Failed to get session token' },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('✅ Sign-in successful');

    return NextResponse.json(
      {
        success: true,
        token: sessionToken,
        userId: user.id,
        email: email,
      },
      { status: 200, headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('❌ Mobile sign-in error:', error);
    return NextResponse.json(
      { error: error.message || 'Sign-in failed' },
      { status: 500, headers: corsHeaders }
    );
  }
}
