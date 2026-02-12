import { NextRequest, NextResponse } from 'next/server';
import { clerkClient, verifyToken } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const { token, email, username, firstName, lastName } = await request.json();

    if (!token || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`📝 Creating Supabase profile for: ${email}`);

    // PRODUCTION-GRADE: Verify JWT signature with Clerk's secret key
    let clerkUserId: string;
    let verifiedEmail: string;
    
    try {
      // Properly verify JWT token signature using Clerk's SDK
      // This validates: signature, expiration, issuer, and audience
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY!,
      });
      
      if (!payload || !payload.sub) {
        throw new Error('Invalid token payload');
      }
      
      clerkUserId = payload.sub;
      
      // Extract email from token claims
      verifiedEmail = (payload as any).email || '';
      
      console.log(`✅ JWT signature verified for user: ${clerkUserId}`);
      
      // Double-check: fetch user from Clerk to ensure they still exist
      const client = await clerkClient();
      const clerkUser = await client.users.getUser(clerkUserId);
      
      if (!clerkUser) {
        throw new Error('User not found in Clerk database');
      }
      
      // Security: Verify email in token matches request email
      const clerkEmail = clerkUser.emailAddresses[0]?.emailAddress;
      if (clerkEmail !== email) {
        console.error(`❌ Email mismatch: token=${clerkEmail}, request=${email}`);
        throw new Error('Email mismatch - possible token hijacking');
      }
      
      console.log(`✅ Email verified: ${email}`);
      
    } catch (error: any) {
      console.error('❌ Token verification failed:', error);
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      
      // Detailed error for debugging (remove in production)
      if (process.env.NODE_ENV === 'development') {
        console.error('Token (first 50 chars):', token?.substring(0, 50));
      }
      
      return NextResponse.json(
        { 
          error: 'Authentication failed - invalid or expired token',
          details: error.message 
        },
        { status: 401, headers: corsHeaders }
      );
    }

    // Create Supabase profile using service role (bypasses RLS for user creation)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (existingProfile) {
      console.log('✅ Profile already exists');
      return NextResponse.json(
        { success: true, message: 'Profile already exists' },
        { headers: corsHeaders }
      );
    }

    // Create new profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        clerk_user_id: clerkUserId,
        email: email,
        username: username || null,
        first_name: firstName || null,
        last_name: lastName || null,
        avatar_url: null,
      })
      .select()
      .single();

    if (profileError) {
      console.error('❌ Failed to create profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to create profile', details: profileError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('✅ Supabase profile created successfully');

    return NextResponse.json(
      {
        success: true,
        userId: clerkUserId,
        profileId: profile.id,
      },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('❌ Create profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
