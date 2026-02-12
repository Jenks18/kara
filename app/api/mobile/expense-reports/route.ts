import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing authorization token' },
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.substring(7);
    const clerk = await clerkClient();
    
    // Verify the sign-in token
    let userId: string;
    try {
      const verifiedToken = await clerk.signInTokens.verifyToken({ token });
      userId = verifiedToken.userId;
      console.log('✅ Mobile request authenticated for user:', userId);
    } catch (error: any) {
      console.error('❌  Token verification failed:', error.message);
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Get expense reports from the main API endpoint
    // This is a simple proxy - in production you'd want to query Supabase directly
    const workspaceId = request.nextUrl.searchParams.get('workspaceId');
    
    // For now, return empty array (you'll need to add Supabase queries here)
    return NextResponse.json(
      [],
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('❌ Mobile API error:', error);
    return NextResponse.json(
      { error: 'Server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
