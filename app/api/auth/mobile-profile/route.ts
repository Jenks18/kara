import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * Extract userId from JWT in Authorization header.
 * Decodes the Clerk JWT to get the 'sub' claim.
 */
function getUserIdFromJwt(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
    return payload.sub || null;
  } catch {
    return null;
  }
}

/**
 * GET /api/auth/mobile-profile
 * Fetch the user's profile from Supabase using JWT auth.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromJwt(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization token' },
        { status: 401, headers: corsHeaders }
      );
    }

    console.log('📱 Fetching mobile profile for:', userId);

    // Verify user exists in Clerk
    const clerk = await clerkClient();
    let clerkUser;
    try {
      clerkUser = await clerk.users.getUser(userId);
    } catch {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch profile
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('❌ Error fetching profile:', error.message);
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Build response with Clerk data merged
    const result = {
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
    };

    console.log('✅ Profile fetched for:', userId);
    return NextResponse.json(result, { headers: corsHeaders });
  } catch (error: any) {
    console.error('❌ Mobile profile error:', error.message);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * PATCH /api/auth/mobile-profile
 * Update the user's profile in Supabase using JWT auth.
 */
export async function PATCH(request: NextRequest) {
  try {
    const userId = getUserIdFromJwt(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization token' },
        { status: 401, headers: corsHeaders }
      );
    }

    const body = await request.json();
    console.log('📝 Updating mobile profile for:', userId);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const updates: Record<string, any> = {
      user_id: userId,
      updated_at: new Date().toISOString(),
    };

    // Allow updating these fields
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

    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(updates, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating profile:', error.message);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('✅ Profile updated for:', userId);
    return NextResponse.json({ success: true, profile: data }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('❌ Mobile profile update error:', error.message);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
