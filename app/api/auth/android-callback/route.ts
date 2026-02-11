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

    // Send JWT to Android app via deep link
    const deepLink = `mafutapass://auth?jwt=${jwt}`;
    
    // Use HTML with JavaScript for reliable redirect (302 doesn't work with custom schemes)
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
    p { margin: 5px 0; opacity: 0.9; }
    button {
      margin-top: 20px;
      padding: 12px 24px;
      font-size: 16px;
      color: white;
      background: rgba(255,255,255,0.2);
      border: 2px solid white;
      border-radius: 8px;
      cursor: pointer;
    }
    button:hover {
      background: rgba(255,255,255,0.3);
    }
  </style>
</head>
<body>
  <div class="spinner"></div>
  <h1>✅ Sign In Successful!</h1>
  <p>Returning to MafutaPass app...</p>
  <button onclick="tryAgain()" style="display: none;" id="retryBtn">Tap to Open App</button>
  
  <script>
    const deepLink = "${deepLink}";
    let redirected = false;
    
    function tryAgain() {
      window.location.href = deepLink;
    }
    
    // Try to redirect immediately
    window.location.href = deepLink;
    redirected = true;
    
    // Show manual button after 2 seconds if still here
    setTimeout(function() {
      if (!document.hidden) {
        document.getElementById('retryBtn').style.display = 'block';
        document.querySelector('.spinner').style.display = 'none';
        document.querySelector('p').textContent = 'If the app didn\\'t open automatically:';
      }
    }, 2000);
    
    // Detect if user returns to this page (redirect failed)
    document.addEventListener('visibilitychange', function() {
      if (!document.hidden && redirected) {
        document.getElementById('retryBtn').style.display = 'block';
        document.querySelector('.spinner').style.display = 'none';
      }
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
