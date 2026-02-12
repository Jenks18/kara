import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';

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
    const { userId, username } = await request.json();

    if (!userId || !username) {
      return NextResponse.json(
        { error: 'Missing userId or username' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`📝 Updating username for user ${userId} to: ${username}`);

    // Update username in Clerk
    const client = await clerkClient();
    await client.users.updateUser(userId, {
      username: username,
    });

    console.log('✅ Username updated successfully');

    return NextResponse.json(
      { success: true, username },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Error updating username:', error);
    return NextResponse.json(
      { error: 'Failed to update username', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
