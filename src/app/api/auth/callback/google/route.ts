import { NextRequest, NextResponse } from 'next/server';
import { executeD1 } from '@/lib/cloudflareD1';
import { setSessionCookie, AuthUser } from '@/lib/authSession';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const host = req.headers.get('host') || 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  const baseUrl = `${proto}://${host}`;

  if (error || !code) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(`${baseUrl}/?auth_error=${encodeURIComponent(error || 'cancelled')}`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing in .env.local' },
      { status: 500 }
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
      return NextResponse.redirect(`${baseUrl}/?auth_error=token_exchange_failed`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch authenticated user profile from Google UserInfo endpoint
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileRes.ok) {
      console.error('Failed to fetch Google userinfo');
      return NextResponse.redirect(`${baseUrl}/?auth_error=profile_fetch_failed`);
    }

    const profile = await profileRes.json();

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
    return NextResponse.redirect(`${baseUrl}/?view=tracker`);
  } catch (err: any) {
    console.error('Fatal Google Auth Callback error:', err);
    return NextResponse.redirect(`${baseUrl}/?auth_error=${encodeURIComponent(err.message)}`);
  }
}
