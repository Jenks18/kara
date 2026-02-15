import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAndExtractUser } from '@/lib/auth/mobile-auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * POST /api/mobile/auth
 * Exchange a verified mobile JWT for a Supabase session.
 * Creates the Supabase auth user on first call, signs in on subsequent calls.
 * Handles email_exists by updating the password (Clerk userId may have changed).
 */
export async function POST(request: NextRequest) {
  try {
    const verifiedUser = await verifyAndExtractUser(request);
    if (!verifiedUser) {
      return NextResponse.json(
        { error: 'Invalid or missing authorization token' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { userId, email } = verifiedUser;

    // Try signing in first (most common path for returning users)
    const { data: { session }, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: userId,
    });

    if (session) {
      return NextResponse.json({
        success: true,
        supabase_token: session.access_token,
        refresh_token: session.refresh_token,
      }, { headers: corsHeaders });
    }

    // Sign-in failed — user may not exist or password mismatch
    // Try creating the user
    const { error: createError } = await supabase.auth.admin.createUser({
      email,
      password: userId,
      email_confirm: true,
      user_metadata: { clerk_user_id: userId },
    });

    if (createError) {
      if (createError.message?.includes('already been registered')) {
        // User exists but password doesn't match (Clerk userId changed).
        // Update their password to the current Clerk userId.
        const { data: { users } } = await supabase.auth.admin.listUsers();
        const existingUser = users.find((u: any) => u.email === email);
        if (existingUser) {
          await supabase.auth.admin.updateUserById(existingUser.id, {
            password: userId,
          });
        }
      } else {
        console.error('Failed to create Supabase user:', createError);
        return NextResponse.json(
          { error: 'Failed to create database session' },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // Sign in with the (newly created or updated) credentials
    const { data: { session: newSession }, error: finalError } = await supabase.auth.signInWithPassword({
      email,
      password: userId,
    });

    if (finalError || !newSession) {
      console.error('Failed final sign-in:', finalError);
      return NextResponse.json(
        { error: 'Failed to create database session' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      success: true,
      supabase_token: newSession.access_token,
      refresh_token: newSession.refresh_token,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Mobile auth error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
