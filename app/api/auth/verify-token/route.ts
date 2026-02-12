import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';

/**
 * Verify sign-in token and return user data for mobile apps
 * Mobile apps send sign-in token as Bearer token
 * This endpoint verifies it and returns user info + creates session if needed
 */

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
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing authorization token' },
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer '
    console.log('🔍 Verifying sign-in token...');

    const clerk = await clerkClient();
    
    // Verify the sign-in token
    try {
      const verifiedToken = await clerk.signInTokens.verifyToken({ token });
      console.log('✅ Token verified:', verifiedToken.userId);
      
      // Get user data
      const user = await clerk.users.getUser(verifiedToken.userId);
      
      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.emailAddresses[0]?.emailAddress,
          firstName: user.firstName,
          lastName: user.lastName,
          imageUrl: user.imageUrl,
        }
      }, { headers: corsHeaders });
    } catch (error: any) {
      console.error('❌ Token verification failed:', error.message);
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401, headers: corsHeaders }
      );
    }
  } catch (error: any) {
    console.error('❌ Verification endpoint error:', error);
    return NextResponse.json(
      { error: 'Verification failed', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
