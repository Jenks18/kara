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
    const { email, password, userId } = await req.json();

    console.log('📱 Mobile sign-in request:', { email, userId: userId ? 'provided' : 'not provided' });

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Missing email or password' },
        { status: 400, headers: corsHeaders }
      );
    }

    const client = await clerkClient();
    
    // Get user by userId (if provided) or email
    // Using userId avoids race condition after sign-up
    // With retry logic for eventual consistency
    let user;
    
    if (userId) {
      console.log('🆔 Looking up user by userId:', userId);
      
      // Retry logic with exponential backoff (max 3 attempts over ~7 seconds)
      let lastError: any;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          user = await client.users.getUser(userId);
          console.log(`✅ User found by userId on attempt ${attempt}:`, user.id, 'email:', user.emailAddresses[0]?.emailAddress);
          break; // Success, exit loop
        } catch (error: any) {
          lastError = error;
          console.error(`❌ Attempt ${attempt}/3 - Error looking up user by userId:`, userId, 'Error:', error.message || error);
          
          if (attempt < 3) {
            const delay = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s
            console.log(`⏳ Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      // If all retries failed, return error
      if (!user) {
        console.error('❌ All retry attempts failed. Last error:', JSON.stringify(lastError, null, 2));
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401, headers: corsHeaders }
        );
      }
    } else {
      console.log('📧 Looking up user by email');
      const users = await client.users.getUserList({ emailAddress: [email] });
      
      console.log('📥 Found users:', users.data?.length || 0);
      
      if (!users.data || users.data.length === 0) {
        console.log('❌ User not found for email:', email);
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401, headers: corsHeaders }
        );
      }
      
      user = users.data[0];
    }
    
    // Check if email is verified
    console.log('✅ User retrieved successfully:', user.id);
    console.log('📧 Checking email verification status...');
    console.log('📧 Email addresses:', JSON.stringify(user.emailAddresses, null, 2));
    console.log('📧 Primary email ID:', user.primaryEmailAddressId);
    
    const primaryEmail = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId);
    
    if (!primaryEmail) {
      console.error('❌ No primary email found for user!');
      return NextResponse.json(
        { error: 'Account configuration error' },
        { status: 500, headers: corsHeaders }
      );
    }
    
    console.log('📧 Primary email:', primaryEmail.emailAddress);
    console.log('📧 Verification status:', primaryEmail.verification?.status);
    
    if (primaryEmail.verification?.status !== 'verified') {
      console.log('📧 Email not verified - user needs to verify');
      
      // Email was already sent during sign-up, just inform user
      return NextResponse.json(
        {
          success: true,  // Changed to true so Android recognizes this as a valid response
          needsVerification: true,
          userId: user.id,
          email: email,
          message: 'Email verification required. Check your inbox for verification code.'
        },
        { status: 200, headers: corsHeaders }
      );
    }

    console.log('✅ Email is verified, proceeding with password authentication');
    
    // Email is verified, verify password and create session token
    // Note: Clerk Backend SDK doesn't have password verification
    // We need to use the Frontend API for this part
    const frontendAPI = process.env.NEXT_PUBLIC_CLERK_FRONTEND_API || 'https://clerk.mafutapass.com';
    
    try {
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
        console.error('❌ Failed to initiate sign-in:', await signInResponse.text());
        throw new Error('Failed to initiate sign-in');
      }

      const signInData = await signInResponse.json();
      console.log('📥 Sign-in response:', JSON.stringify(signInData).substring(0, 500));
      
      const signInId = signInData.response?.sign_in?.id || signInData.client?.sign_in?.id;

      if (!signInId) {
        console.error('❌ Invalid sign-in response, no sign_in ID found');
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
        console.error('❌ No session created:', JSON.stringify(attemptData).substring(0, 300));
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
    } catch (frontendError: any) {
      console.error('❌ Frontend API error:', frontendError.message);
      return NextResponse.json(
        { error: 'Sign-in failed: ' + frontendError.message },
        { status: 500, headers: corsHeaders }
      );
    }

  } catch (error: any) {
    console.error('❌ Mobile sign-in error:', error);
    return NextResponse.json(
      { error: error.message || 'Sign-in failed' },
      { status: 500, headers: corsHeaders }
    );
  }
}
