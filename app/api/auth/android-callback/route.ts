import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Android OAuth callback endpoint
 * After successful OAuth on web, this endpoint:
 * 1. Gets Clerk session JWT
 * 2. Redirects to Android app with JWT: mafutapass://auth?jwt={token}
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, getToken } = await auth();
    
    if (!userId) {
      // Not authenticated - redirect to sign in
      return NextResponse.redirect(new URL('/sign-in?mobile=android', request.url));
    }

    // Get JWT session token for Android app
    const jwt = await getToken();
    
    if (!jwt) {
      console.error('Failed to get JWT token');
      return NextResponse.json(
        { error: 'Failed to get session token' },
        { status: 500 }
      );
    }

    console.log('Android OAuth success - sending JWT to app');

    // Android Intent URI - more reliable than custom scheme
    const intentUri = `intent://auth?jwt=${encodeURIComponent(jwt)}#Intent;scheme=mafutapass;package=com.mafutapass.app;end`;
    
    // Fallback deep link
    const deepLink = `mafutapass://auth?jwt=${encodeURIComponent(jwt)}`;
    
    // Use HTML with multiple redirect attempts for maximum compatibility
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Returning to MafutaPass...</title>
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
    p { margin: 5px 0; opacity: 0.9; font-size: 16px; }
    button {
      margin-top: 20px;
      padding: 14px 28px;
      font-size: 18px;
      font-weight: 600;
      color: white;
      background: rgba(255,255,255,0.2);
      border: 2px solid white;
      border-radius: 12px;
      cursor: pointer;
      display: none;
    }
    button:active {
      background: rgba(255,255,255,0.4);
      transform: scale(0.98);
    }
  </style>
</head>
<body>
  <div class="spinner" id="spinner"></div>
  <h1>✅ Sign In Successful!</h1>
  <p id="status">Returning to MafutaPass app...</p>
  <button onclick="openApp()" id="openBtn">Open MafutaPass App</button>
  
  <script>
    const intentUri = "${intentUri}";
    const deepLink = "${deepLink}";
    let attemptCount = 0;
    
    function openApp() {
      // Try intent URI first (most reliable on Android)
      try {
        window.location.href = intentUri;
        attemptCount++;
      } catch (e) {
        // Fallback to deep link
        window.location.href = deepLink;
      }
    }
    
    // Try opening immediately
    openApp();
    
    // Show button after 1.5 seconds if still here
    setTimeout(function() {
      if (!document.hidden) {
        document.getElementById('spinner').style.display = 'none';
        document.getElementById('status').textContent = 'Tap below to open the app:';
        document.getElementById('openBtn').style.display = 'block';
      }
    }, 1500);
    
    // Try again if user comes back to tab
    let hidden = false;
    document.addEventListener('visibilitychange', function() {
      if (!document.hidden && hidden && attemptCount === 1) {
        // User came back - try again
        document.getElementById('openBtn').style.display = 'block';
        document.getElementById('spinner').style.display = 'none';
      }
      hidden = document.hidden;
    });
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
    console.error('Android callback error:', error);
    return NextResponse.json(
      { error: 'Failed to process authentication' },
      { status: 500 }
    );
  }
}
