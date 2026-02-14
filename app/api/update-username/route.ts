import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

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
    // Authenticate: only the signed-in user can update their own username
    const { userId: authUserId } = await auth();
    if (!authUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { username } = await request.json();

    if (!username) {
      return NextResponse.json(
        { error: 'Missing username' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Only allow updating YOUR OWN username
    const client = await clerkClient();
    await client.users.updateUser(authUserId, {
      username: username,
    });

    return NextResponse.json(
      { success: true, username },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error updating username:', error);
    return NextResponse.json(
      { error: 'Failed to update username', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
