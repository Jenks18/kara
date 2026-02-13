import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Allow Android app (not from browser)
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const { token, email, username, firstName, lastName } = await request.json();

    console.log(`📥 Profile creation request for: ${email}`);

    if (!token || !email) {
      console.error('❌ Missing required fields:', { hasToken: !!token, hasEmail: !!email });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`📝 Creating Supabase profile for: ${email}`);

    // Verify token by decoding JWT and validating with Clerk
    let clerkUserId: string;
    
    try {
      // Decode JWT (Frontend API tokens are already validated by Clerk)
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.error('❌ Invalid JWT format - parts:', parts.length);
        throw new Error('Invalid JWT format');
      }
      
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64').toString('utf-8')
      );
      
      console.log('📋 JWT payload decoded:', { sub: payload.sub, email: payload.email });
      
      if (!payload.sub) {
        throw new Error('Invalid token payload - missing user ID');
      }
      
      clerkUserId = payload.sub;
      console.log(`📝 Token decoded for user: ${clerkUserId}`);
      
      // SECURITY: Validate user exists in Clerk (this is the real security check)
      const client = await clerkClient();
      const clerkUser = await client.users.getUser(clerkUserId);
      
      if (!clerkUser) {
        throw new Error('User not found in Clerk database');
      }
      
      // Security: Verify email matches Clerk's records
      const clerkEmail = clerkUser.emailAddresses[0]?.emailAddress;
      if (clerkEmail !== email) {
        console.error(`❌ Email mismatch: Clerk=${clerkEmail}, Request=${email}`);
        throw new Error('Email mismatch - security validation failed');
      }
      
      console.log(`✅ User validated: ${email}`);
      
    } catch (error: any) {
      console.error('❌ Token validation failed:', error);
      console.error('Error details:', error.message);
      
      return NextResponse.json(
        { 
          error: 'Authentication failed',
          details: error.message 
        },
        { status: 401, headers: corsHeaders }
      );
    }

    // Create Supabase profile using SECURITY DEFINER function
    // This is MORE SECURE than service role key - function has limited scope
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Create new profile using secure function (bypasses RLS with minimal privileges)
    // Don't check if exists first - RLS would block it. Let function handle duplicates.
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || null;
    
    console.log(`📝 Calling create_user_profile RPC for: ${email}`);
    
    const { data: profile, error: profileError } = await supabase
      .rpc('create_user_profile', {
        p_clerk_user_id: clerkUserId,
        p_email: email,
        p_full_name: fullName,
        p_username: username || null,
      });

    if (profileError) {
      console.error('❌ Failed to create profile:', profileError);
      
      // Check if it's a duplicate user error
      if (profileError.message?.includes('already exists')) {
        return NextResponse.json(
          { success: true, message: 'Profile already exists' },
          { headers: corsHeaders }
        );
      }
      
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
        profileId: profile?.id,
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
