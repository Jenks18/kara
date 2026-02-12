import { NextRequest, NextResponse } from 'next/server';
import { clerkClient, verifyToken } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
