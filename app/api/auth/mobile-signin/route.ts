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
  const startTime = Date.now();
  const version = 'v2.0.0-detailed-logging';
  console.log('🚀 [SIGNIN] Request received at', new Date().toISOString(), 'version:', version);
  
  try {
    const body = await req.json();
    console.log('📦 [SIGNIN] Request body:', JSON.stringify(body, null, 2));
    
    const { email, password, userId } = body;

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
        const attemptStart = Date.now();
        console.log(`🔄 [SIGNIN] Retry attempt ${attempt}/3 started at ${Date.now() - startTime}ms`);
        
        try {
          user = await client.users.getUser(userId);
          console.log(`✅ [SIGNIN] User found on attempt ${attempt} (took ${Date.now() - attemptStart}ms):`, user.id, 'email:', user.emailAddresses[0]?.emailAddress);
          break; // Success, exit loop
        } catch (error: any) {
          lastError = error;
          console.error(`❌ [SIGNIN] Attempt ${attempt}/3 failed after ${Date.now() - attemptStart}ms`);
          console.error(`❌ [SIGNIN] Error:`, error.message || error);
          console.error(`❌ [SIGNIN] Error status:`, error.status || 'N/A');
          console.error(`❌ [SIGNIN] Error details:`, JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
          
          if (attempt < 3) {
            const delay = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s
            console.log(`⏳ [SIGNIN] Waiting ${delay}ms before retry (total elapsed: ${Date.now() - startTime}ms)`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      // If all retries failed, return error
      if (!user) {
        console.error(`❌ [SIGNIN] All retry attempts failed after ${Date.now() - startTime}ms`);
        console.error('❌ [SIGNIN] Last error:', JSON.stringify(lastError, Object.getOwnPropertyNames(lastError), 2));
        return NextResponse.json(
          { error: 'Invalid email or password', version, debug: 'all_retries_failed',elapsed: `${Date.now() - startTime}ms` },
          { status: 401, headers: corsHeaders }
        );
      }
    } else {
      console.log(`📧 [SIGNIN] Looking up user by email at ${Date.now() - startTime}ms`);
      const users = await client.users.getUserList({ emailAddress: [email] });
      
      console.log('📥 Found users:', users.data?.length || 0);
      
      if (!users.data || users.data.length === 0) {
        console.log('❌ User not found for email:', email);
        return NextResponse.json(
          { error: 'Invalid email or password', version, debug: 'email_lookup_failed', elapsed: `${Date.now() - startTime}ms` },
          { status: 401, headers: corsHeaders }
        );
      }
      
      user = users.data[0];
    }
    
    // Check if email is verified
    console.log(`✅ [SIGNIN] User retrieved successfully after ${Date.now() - startTime}ms:`, user.id);
    console.log('📧 Checking email verification status...');
    console.log('📧 User metadata:', JSON.stringify(user.unsafeMetadata, null, 2));
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
    console.log('📧 Verification object:', JSON.stringify(primaryEmail.verification, null, 2));
    console.log('📧 Verification status:', primaryEmail.verification?.status);
    
    // Check if user was created via backend and needs verification (via metadata)
    const needsVerificationMetadata = user.unsafeMetadata?.needsEmailVerification === true;
    console.log('📧 Needs verification (metadata):', needsVerificationMetadata);
    
    // More explicit check - only proceed if explicitly verified
    const isVerified = primaryEmail.verification?.status === 'verified';
    console.log('📧 Is verified (Clerk status)?:', isVerified);
    
    // Force verification if metadata flag is set, regardless of Clerk status
    if (needsVerificationMetadata || !isVerified) {
      console.log('==========================================');
      console.log('EMAIL VERIFICATION BLOCK ENTERED');
      console.log('User ID:', user.id);
      console.log('Email:', email);
      console.log('Primary Email ID:', primaryEmail.id);
      console.log('==========================================');
      
      // Send verification email via Frontend API
      try {
        const frontendAPI = process.env.NEXT_PUBLIC_CLERK_FRONTEND_API || 'https://clerk.mafutapass.com';
        console.log('Frontend API URL:', frontendAPI);
        
        // Start sign-in to get session context
        console.log('STEP 1: Initiating sign-in for verification...');
        const signInResponse = await fetch(`${frontendAPI}/v1/client/sign_ins`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: email }),
        });
        
        console.log('Sign-in response status:', signInResponse.status);
        console.log('Sign-in response OK?:', signInResponse.ok);
        
        if (signInResponse.ok) {
          const signInData = await signInResponse.json();
          console.log('Sign-in data:', JSON.stringify(signInData, null, 2));
          const signInId = signInData.response?.id;
          
          if (signInId) {
            console.log('STEP 2: Got sign-in ID:', signInId);
            console.log('STEP 3: Calling prepare_first_factor with email_code strategy...');
            console.log('Email address ID:', primaryEmail.id);
            
            // Send verification email
            const prepareResponse = await fetch(
              `${frontendAPI}/v1/client/sign_ins/${signInId}/prepare_first_factor`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  strategy: 'email_code',
                  email_address_id: primaryEmail.id,
                }),
              }
            );
            
            console.log('Prepare response status:', prepareResponse.status);
            console.log('Prepare response OK?:', prepareResponse.ok);
            
            if (prepareResponse.ok) {
              const prepareData = await prepareResponse.json();
              console.log('==========================================');
              console.log('SUCCESS: Verification email sent!');
              console.log('Prepare response data:', JSON.stringify(prepareData, null, 2));
              console.log('==========================================');
            } else {
              const errorText = await prepareResponse.text();
              console.error('==========================================');
              console.error('FAILED: Could not send verification email');
              console.error('Error response:', errorText);
              console.error('==========================================');
            }
          } else {
            console.error('ERROR: No sign-in ID in response');
          }
        } else {
          const errorText = await signInResponse.text();
          console.error('ERROR: Sign-in request failed:', errorText);
        }
      } catch (emailError: any) {
        console.error('==========================================');
        console.error('EXCEPTION while sending verification email');
        console.error('Error:', emailError.message);
        console.error('Stack:', emailError.stack);
        console.error('==========================================');
      }
      
      return NextResponse.json(
        {
          success: true,
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
          { error: 'Invalid email or password', version, debug: 'password_verification_failed', elapsed: `${Date.now() - startTime}ms` },
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
      console.error(`❌ [SIGNIN] Total time: ${Date.now() - startTime}ms`);
      return NextResponse.json(
        { error: 'Sign-in failed: ' + frontendError.message },
        { status: 500, headers: corsHeaders }
      );
    }

  } catch (error: any) {
    console.error('❌ Mobile sign-in error:', error);
    console.error(`❌ [SIGNIN] Total time: ${Date.now() - startTime}ms`);
    return NextResponse.json(
      { error: error.message || 'Sign-in failed' },
      { status: 500, headers: corsHeaders }
    );
  }
}
