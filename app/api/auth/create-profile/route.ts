import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server-client';

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

    // Decode and verify JWT token
    let clerkUserId: string;
    
    try {
      // Decode JWT to extract user ID (JWT format: header.payload.signature)
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }
      
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
      clerkUserId = payload.sub;
      
      if (!clerkUserId) {
        throw new Error('No user ID in token');
      }
      
      console.log(`📋 Token decoded, user ID: ${clerkUserId}`);
      
      // Verify user exists in Clerk (this validates the token is real)
      const client = await clerkClient();
      const clerkUser = await client.users.getUser(clerkUserId);
      
      if (!clerkUser) {
        throw new Error('User not found in Clerk');
      }
      
      console.log(`✅ Token verified for user: ${clerkUserId}`);
    } catch (error: any) {
      console.error('❌ Token verification failed:', error);
      console.error('Error details:', error.message);
      return NextResponse.json(
        { error: 'Invalid session token', details: error.message },
        { status: 401, headers: corsHeaders }
      );
    }
    
    // Get user from Clerk to verify email matches
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(clerkUserId);
    const userEmail = clerkUser.emailAddresses[0]?.emailAddress;

    if (userEmail !== email) {
      console.error('❌ Email mismatch - possible security issue');
      return NextResponse.json(
        { error: 'Email does not match token' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Create Supabase profile
    const supabase = await createServerClient();
    
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
