import { NextRequest, NextResponse } from 'next/server';
import { executeD1 } from '@/lib/cloudflareD1';
import { setSessionCookie, AuthUser } from '@/lib/authSession';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { credential, demoUser } = body;

    let user: AuthUser;

    if (typeof credential === 'string' && credential.trim().length > 0) {
      const clientId = process.env.GOOGLE_CLIENT_ID?.trim() || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
      if (!clientId) {
        return NextResponse.json({ error: 'OAuth client is not configured' }, { status: 500 });
      }

      // Cryptographically verify Google ID Token via Google's tokeninfo endpoint
      const verifyRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential.trim())}`,
        { cache: 'no-store' }
      );

      if (!verifyRes.ok) {
        return NextResponse.json({ error: 'Invalid or expired Google token' }, { status: 401 });
      }

      const payload = await verifyRes.json();
      const validIss =
        payload.iss === 'accounts.google.com' ||
        payload.iss === 'https://accounts.google.com';

      if (!validIss || payload.aud !== clientId || !payload.sub || !payload.email) {
        return NextResponse.json({ error: 'Google token verification failed' }, { status: 401 });
      }

      if (payload.email_verified !== true && payload.email_verified !== 'true') {
        return NextResponse.json({ error: 'Google email is not verified' }, { status: 401 });
      }

      user = {
        id: String(payload.sub),
        email: String(payload.email),
        name: String(payload.name || payload.email.split('@')[0]),
        picture: payload.picture ? String(payload.picture) : undefined,
      };
    } else if (demoUser) {
      // Strictly disallow demo auth in production or unless explicitly enabled in dev
      if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEMO_AUTH !== 'true') {
        return NextResponse.json({ error: 'Demo authentication is disabled' }, { status: 403 });
      }
      user = {
        id: 'usr-demo-dr-vance',
        email: 'dr.vance@meducid.internal',
        name: 'Dr. Arthur Vance (Clinician)',
        picture: '',
      };
    } else {
      return NextResponse.json({ error: 'Missing credential' }, { status: 400 });
    }

    // Upsert into Cloudflare D1
    try {
      await executeD1(
        `INSERT INTO users (id, email, name, picture, last_login)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           picture = excluded.picture,
           last_login = CURRENT_TIMESTAMP;`,
        [user.id, user.email, user.name, user.picture || '']
      );
    } catch (d1Err) {
      console.warn('Notice: D1 user table sync warning (continuing with session):', d1Err);
    }

    // Set 30-day persistent session cookie
    await setSessionCookie(user);

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Google Auth Route Error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
