import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { executeD1 } from '@/lib/cloudflareD1';
import { setSessionCookie, AuthUser, getSafeBaseUrl } from '@/lib/authSession';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const returnedState = searchParams.get('state');
  const storedState = req.cookies.get('meducid_oauth_state')?.value;

  const baseUrl = getSafeBaseUrl(req);

  const clearStateCookie = (res: NextResponse) => {
    res.cookies.delete('meducid_oauth_state');
    return res;
  };

  if (error || !code) {
    console.error('Google OAuth callback error:', error);
    return clearStateCookie(
      NextResponse.redirect(`${baseUrl}/?auth_error=${encodeURIComponent(error || 'cancelled')}`)
    );
  }

  // Verify CSRF state nonce using constant-time comparison
  if (
    !returnedState ||
    !storedState ||
    returnedState.length !== storedState.length ||
    !crypto.timingSafeEqual(Buffer.from(returnedState), Buffer.from(storedState))
  ) {
    console.error('Google OAuth CSRF state mismatch');
    return clearStateCookie(
      NextResponse.redirect(`${baseUrl}/?auth_error=invalid_state`)
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    return clearStateCookie(
      NextResponse.json(
        { error: 'OAuth configuration is missing' },
        { status: 500 }
      )
    );
  }

  const redirectUri = `${baseUrl}/api/auth/callback/google`;

  try {
    // 1. Exchange authorization code with Google for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error('Google token exchange failed:', tokenRes.status, errBody);
      return clearStateCookie(NextResponse.redirect(`${baseUrl}/?auth_error=token_exchange_failed`));
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch authenticated user profile from Google UserInfo endpoint
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileRes.ok) {
      console.error('Failed to fetch Google userinfo');
      return clearStateCookie(NextResponse.redirect(`${baseUrl}/?auth_error=profile_fetch_failed`));
    }

    const profile = await profileRes.json();

    if (!profile.sub || !profile.email) {
      return clearStateCookie(NextResponse.redirect(`${baseUrl}/?auth_error=incomplete_profile`));
    }

    const user: AuthUser = {
      id: profile.sub,
      email: profile.email,
      name: profile.name || profile.email.split('@')[0],
      picture: profile.picture || '',
    };

    // 3. Upsert user into Cloudflare D1
    try {
      await executeD1(
        `INSERT INTO users (id, email, name, picture, last_login)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           picture = excluded.picture,
           last_login = CURRENT_TIMESTAMP;`,
        [user.id, user.email, user.name, user.picture]
      );
    } catch (d1Err) {
      console.warn('Notice: D1 user table sync warning:', d1Err);
    }

    // 4. Set persistent 30-day session cookie
    await setSessionCookie(user);

    // 5. Redirect back to MEDUCID Report Tracker view
    return clearStateCookie(NextResponse.redirect(`${baseUrl}/?view=tracker`));
  } catch (err) {
    console.error('Fatal Google Auth Callback error:', err);
    return clearStateCookie(NextResponse.redirect(`${baseUrl}/?auth_error=auth_failed`));
  }
}
