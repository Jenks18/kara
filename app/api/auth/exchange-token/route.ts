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

/**
 * Create session JWT directly using Backend SDK
 * Bypasses Cloudflare blocking of Frontend API token exchange
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('🔄 Creating session JWT for user:', userId);

    const client = await clerkClient();
    
    // Verify user exists
    const user = await client.users.getUser(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Create a session for the user using Backend SDK
    const sessionToken = await client.sessions.createSession({
      userId: userId,
    });

    if (!sessionToken || !sessionToken.lastActiveToken?.jwt) {
      console.error('❌ No JWT in session response');
      return NextResponse.json(
        { success: false, error: 'Failed to create session' },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('✅ Session created successfully! Session ID:', sessionToken.id);

    return NextResponse.json({
      success: true,
      token: sessionToken.lastActiveToken.jwt,
      userId: userId,
      sessionId: sessionToken.id,
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('❌ Session creation error:', error.message);
    return NextResponse.json(
      { success: false, error: 'Failed to create session' },
      { status: 500, headers: corsHeaders }
    );
  }
}
