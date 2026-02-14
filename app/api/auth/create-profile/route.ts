import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
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

    console.log(`📝 Creating profile for: ${email}`);

    // Decode and validate JWT token
    let clerkUserId: string;
    
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }
      
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
      
      if (!payload.sub) {
        throw new Error('Invalid token payload');
      }
      
      clerkUserId = payload.sub;
      
      // Validate user exists in Clerk
      const client = await clerkClient();
      const clerkUser = await client.users.getUser(clerkUserId);
      
      if (!clerkUser) {
        throw new Error('User not found');
      }
      
      // Verify email matches
      const clerkEmail = clerkUser.emailAddresses[0]?.emailAddress;
      if (clerkEmail !== email) {
        throw new Error('Email mismatch');
      }
      
      console.log(`✅ User validated: ${clerkUserId}`);
      
    } catch (error: any) {
      console.error('❌ Token validation failed:', error.message);
      
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Create Supabase profile
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || null;
    
    const { data: profile, error: profileError } = await supabase
      .rpc('create_user_profile', {
        p_clerk_user_id: clerkUserId,
        p_email: email,
        p_full_name: fullName,
        p_username: username || null,
      });

    if (profileError) {
      console.error('❌ Failed to create profile:', profileError.message);
      
      if (profileError.message?.includes('already exists')) {
        return NextResponse.json(
          { success: true, message: 'Profile already exists' },
          { headers: corsHeaders }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to create profile' },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('✅ Profile created successfully');

    return NextResponse.json(
      { success: true, userId: clerkUserId, profileId: profile?.id },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('❌ Create profile error:', error.message);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
