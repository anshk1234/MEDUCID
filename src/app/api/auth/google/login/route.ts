import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSafeBaseUrl } from '@/lib/authSession';

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();

  if (!clientId) {
    return NextResponse.json(
      {
        error: 'OAuth client configuration is missing.',
      },
      { status: 500 }
    );
  }

  const baseUrl = getSafeBaseUrl(req);
  const redirectUri = `${baseUrl}/api/auth/callback/google`;

  // Generate CSRF state nonce
  const state = crypto.randomBytes(32).toString('hex');

  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', clientId);
  googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', 'openid email profile');
  googleAuthUrl.searchParams.set('prompt', 'select_account');
  googleAuthUrl.searchParams.set('access_type', 'offline');
  googleAuthUrl.searchParams.set('state', state);

  const response = NextResponse.redirect(googleAuthUrl.toString());
  response.cookies.set('meducid_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });

  return response;
}
