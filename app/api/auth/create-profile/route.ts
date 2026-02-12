import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';

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

    // Verify token with Clerk
    const client = await clerkClient();
    let clerkUserId: string;
    
    try {
      const session = await client.sessions.verifySession(token, token);
      clerkUserId = session.userId;
      console.log(`✅ Token verified for user: ${clerkUserId}`);
    } catch (error) {
      console.error('❌ Token verification failed:', error);
      return NextResponse.json(
        { error: 'Invalid session token' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Get user from Clerk to verify data
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
    const supabase = await createClient();
    
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
