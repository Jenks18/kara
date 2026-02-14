/**
 * Shared utility: exchange a Clerk sign-in token for a session JWT.
 *
 * The Clerk Frontend API requires client context (__client cookie) to create
 * sessions and return JWTs. When calling from a server (no browser), we must:
 *   1. GET /v1/client          → initialize a client, capture cookies
 *   2. POST /v1/client/sign_ins → exchange ticket WITH those cookies
 *
 * This is the same flow browsers execute automatically via the Clerk JS SDK.
 */

export async function exchangeSignInTokenForJwt(
  signInTokenValue: string
): Promise<{ jwt: string; userId: string } | null> {
  const frontendApi = process.env.NEXT_PUBLIC_CLERK_FRONTEND_API;
  if (!frontendApi) {
    console.error('❌ NEXT_PUBLIC_CLERK_FRONTEND_API not configured');
    return null;
  }

  try {
    // Step 1: Initialize a Clerk client to get __client cookie
    const clientRes = await fetch(
      `${frontendApi}/v1/client?_clerk_js_version=4.70.0`,
      { method: 'GET', cache: 'no-store' as RequestCache }
    );

    if (!clientRes.ok) {
      console.error('❌ Client init failed:', clientRes.status, await clientRes.text());
      return null;
    }

    const cookieString = extractSetCookies(clientRes);
    console.log('🍪 Clerk client initialized, cookies present:', cookieString.length > 0);

    // Step 2: Exchange the sign-in token for a session (with client cookies)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (cookieString) {
      headers['Cookie'] = cookieString;
    }

    const exchangeRes = await fetch(
      `${frontendApi}/v1/client/sign_ins?_clerk_js_version=4.70.0`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ strategy: 'ticket', ticket: signInTokenValue }),
        cache: 'no-store' as RequestCache,
      }
    );

    if (!exchangeRes.ok) {
      const errText = await exchangeRes.text();
      console.error('❌ Ticket exchange failed:', exchangeRes.status, errText);
      return null;
    }

    const data = await exchangeRes.json();

    // Extract JWT — try multiple known paths in the Clerk response
    const jwt =
      data.client?.sessions?.[0]?.last_active_token?.jwt ??
      data.client?.last_active_session?.last_active_token?.jwt ??
      null;

    const userId =
      data.response?.user_id ??
      data.response?.created_user_id ??
      data.client?.sessions?.[0]?.user?.id ??
      '';

    if (!jwt) {
      console.error(
        '❌ No JWT in exchange response. sign_in status:',
        data.response?.status,
        '| sessions:',
        data.client?.sessions?.length ?? 0,
        '| response keys:',
        JSON.stringify({
          topKeys: Object.keys(data),
          responseKeys: data.response ? Object.keys(data.response) : [],
          clientKeys: data.client ? Object.keys(data.client) : [],
          sessionKeys: data.client?.sessions?.[0] ? Object.keys(data.client.sessions[0]) : [],
        })
      );
      return null;
    }

    console.log('✅ JWT obtained, userId:', userId);
    return { jwt, userId };
  } catch (err: any) {
    console.error('❌ Token exchange error:', err.message);
    return null;
  }
}

/**
 * Safely extract Set-Cookie values from a fetch Response and return
 * a string suitable for a Cookie request header.
 */
function extractSetCookies(response: Response): string {
  // Modern Node.js 18.14+: getSetCookie() returns individual Set-Cookie strings
  try {
    const fn = (response.headers as any).getSetCookie;
    if (typeof fn === 'function') {
      const cookies: string[] = fn.call(response.headers);
      if (cookies.length > 0) {
        return cookies.map((c: string) => c.split(';')[0]).join('; ');
      }
    }
  } catch {
    /* fall through */
  }

  // Fallback: parse the raw header.
  // Split on commas that precede a cookie name (word=), avoiding commas
  // inside Expires dates like "Thu, 01 Jan 2025 00:00:00 GMT".
  const raw = response.headers.get('set-cookie');
  if (!raw) return '';
  return raw
    .split(/,(?=\s*[a-zA-Z_][a-zA-Z0-9_]*=)/)
    .map((c) => c.split(';')[0].trim())
    .join('; ');
}
