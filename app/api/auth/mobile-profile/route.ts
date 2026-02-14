import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { createMobileClient } from '@/lib/supabase/mobile-client';
import { verifyAndExtractUser, corsHeaders } from '@/lib/auth/mobile-auth';

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/auth/mobile-profile
 * Fetch the user's profile using verified Clerk JWT + RLS-enforced Supabase client.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify JWT signature via Clerk (not base64 decode)
    const user = await verifyAndExtractUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization token' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Get Clerk user data for the merged response
    const clerk = await clerkClient();
    let clerkUser;
    try {
      clerkUser = await clerk.users.getUser(user.userId);
    } catch {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Create RLS-enforced Supabase client (anon key + minted JWT)
    const mobileClient = await createMobileClient(request);
    if (!mobileClient) {
      return NextResponse.json(
        { error: 'Failed to create database client' },
        { status: 500, headers: corsHeaders }
      );
    }

    const { data: profile, error } = await mobileClient.supabase
      .from('user_profiles')
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error.message);
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      success: true,
      profile: profile || null,
      clerk: {
        id: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress || '',
        firstName: clerkUser.firstName || '',
        lastName: clerkUser.lastName || '',
        username: clerkUser.username || '',
        imageUrl: clerkUser.imageUrl || null,
        fullName: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' '),
      },
    }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Mobile profile error:', error.message);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * PATCH /api/auth/mobile-profile
 * Update the user's profile using verified Clerk JWT + RLS-enforced Supabase client.
 */
export async function PATCH(request: NextRequest) {
  try {
    const mobileClient = await createMobileClient(request);
    if (!mobileClient) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      );
    }

    const body = await request.json();

    const updates: Record<string, any> = {
      user_id: mobileClient.userId,
      updated_at: new Date().toISOString(),
    };

    const allowedFields = [
      'display_name', 'first_name', 'last_name', 'phone_number',
      'date_of_birth', 'legal_first_name', 'legal_last_name',
      'address_line1', 'address_line2', 'city', 'state', 'zip_code', 'country',
      'avatar_emoji', 'avatar_color', 'avatar_image_url', 'user_email',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    const { data, error } = await mobileClient.supabase
      .from('user_profiles')
      .upsert(updates, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error.message);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({ success: true, profile: data }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Mobile profile update error:', error.message);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
