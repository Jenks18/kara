import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Mobile OAuth redirect endpoint
 * After successful OAuth on web, this endpoint gets the Clerk session
 * and redirects back to the Android app with the session token
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, sessionId } = await auth();
    
    if (!userId || !sessionId) {
      // Not authenticated - redirect to sign in
      return NextResponse.redirect(new URL('/sign-in?mobile=true', request.url));
    }

    // User is authenticated - redirect back to Android app with session
    const deepLink = `mafutapass://oauth?session=${sessionId}`;
    
    // Use a 302 redirect with Location header
    // This works better with Chrome Custom Tabs
    return NextResponse.redirect(deepLink, 302);

  } catch (error) {
    console.error('Mobile redirect error:', error);
    return NextResponse.json(
      { error: 'Failed to redirect to mobile app' },
      { status: 500 }
    );
  }
}
