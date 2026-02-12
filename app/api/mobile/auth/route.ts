import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Mobile-specific endpoint to exchange Clerk sign-in token for Supabase JWT
 * This allows mobile apps to access Supabase data while Clerk tracks users
 */
export async function POST(request: NextRequest) {
  try {
    const { token, userId, email } = await request.json();
    
    if (!token || !userId || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

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
