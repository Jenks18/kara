import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Mobile OAuth redirect endpoint
 * After successful OAuth on web, this endpoint gets the Clerk session
 * and redirects back to the Android app with the session token via HTML/JavaScript
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
    
    // Server-side redirects (302) don't work with custom URL schemes in Chrome Custom Tabs
    // Must use HTML with JavaScript window.location redirect
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecting to MafutaPass...</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .spinner {
      width: 50px;
      height: 50px;
      border: 4px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 20px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    h1 { margin: 0 0 10px 0; font-size: 24px; }
    p { margin: 5px 0; opacity: 0.9; }
  </style>
</head>
<body>
  <div class="spinner"></div>
  <h1>✅ Sign In Successful!</h1>
  <p>Returning to MafutaPass...</p>
  <script>
    // Redirect to app immediately
    window.location.href = "${deepLink}";
    
    // Fallback: show message if redirect fails after 2 seconds
    setTimeout(function() {
      document.body.innerHTML = '<div style="text-align: center; padding: 20px;"><h1>⚠️ Unable to open app</h1><p>Please return to the MafutaPass app manually.</p><p style="margin-top: 20px;"><a href="${deepLink}" style="color: white; text-decoration: underline;">Tap here to try again</a></p></div>';
    }, 2000);
  </script>
</body>
</html>
    `.trim();

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });

  } catch (error) {
    console.error('Mobile redirect error:', error);
    return NextResponse.json(
      { error: 'Failed to redirect to mobile app' },
      { status: 500 }
    );
  }
}
