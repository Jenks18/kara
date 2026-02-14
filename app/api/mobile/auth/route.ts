import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAndExtractUser } from '@/lib/auth/mobile-auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Mobile-specific endpoint to exchange Clerk sign-in token for Supabase JWT
 * Requires a valid Clerk JWT in the Authorization header.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify the Clerk JWT signature before doing anything
    const verifiedUser = await verifyAndExtractUser(request);
    if (!verifiedUser) {
      return NextResponse.json(
        { error: 'Invalid or missing authorization token' },
        { status: 401 }
      );
    }

    const { userId, email } = verifiedUser;

    // Generate a Supabase JWT for this user
    // The JWT will have the user's Clerk ID so RLS policies work correctly
    const { data: { session }, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: userId, // Use Clerk user ID as password (they'll never use it directly)
    });

    if (error) {
      // If user doesn't exist in Supabase auth, create them
      const { data: newUser, error: signUpError } = await supabase.auth.admin.createUser({
        email: email,
        password: userId,
        email_confirm: true, // Auto-confirm since we trust Clerk
        user_metadata: {
          clerk_user_id: userId,
        },
      });

      if (signUpError) {
        console.error('Failed to create Supabase user:', signUpError);
        return NextResponse.json(
          { error: 'Failed to create database session' },
          { status: 500 }
        );
      }

      // Sign in the newly created user
      const { data: { session: newSession }, error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: userId,
      });

      if (signInError || !newSession) {
        console.error('Failed to sign in new user:', signInError);
        return NextResponse.json(
          { error: 'Failed to create database session' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        supabase_token: newSession.access_token,
        refresh_token: newSession.refresh_token,
      });
    }

    // Check if session exists
    if (!session) {
      console.error('No session returned from Supabase sign-in');
      return NextResponse.json(
        { error: 'Failed to create database session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      supabase_token: session.access_token,
      refresh_token: session.refresh_token,
    });
  } catch (error) {
    console.error('Mobile auth error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
