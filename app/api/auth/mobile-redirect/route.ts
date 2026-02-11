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
    // Note: The session token should be obtained from the Clerk session
    // For now, we'll pass the sessionId which the app can use to get the full token
    const deepLink = `com.mafutapass.app://callback?session=${sessionId}`;
    
    // Create an HTML page that immediately redirects to the deep link
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Redirecting to MafutaPass...</title>
          <meta http-equiv="refresh" content="0;url=${deepLink}">
        </head>
        <body>
          <p>Redirecting back to MafutaPass app...</p>
          <p>If you're not redirected automatically, <a href="${deepLink}">click here</a>.</p>
          <script>
            // Attempt to redirect via JavaScript as well
            window.location.href = "${deepLink}";
            
            // Fallback: if still on page after 2 seconds, show message
            setTimeout(() => {
              document.body.innerHTML += '<p><strong>Redirect failed?</strong> Make sure the MafutaPass app is installed.</p>';
            }, 2000);
          </script>
        </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' },
    });

  } catch (error) {
    console.error('Mobile redirect error:', error);
    return NextResponse.json(
      { error: 'Failed to redirect to mobile app' },
      { status: 500 }
    );
  }
}
