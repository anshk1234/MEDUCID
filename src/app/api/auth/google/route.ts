import { NextRequest, NextResponse } from 'next/server';
import { executeD1, queryD1 } from '@/lib/cloudflareD1';
import { setSessionCookie, AuthUser } from '@/lib/authSession';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { credential, demoUser } = body;

    let user: AuthUser;

    if (credential) {
      // Decode Google ID Token payload (standard JWT part 2)
      const parts = credential.split('.');
      if (parts.length < 2) {
        return NextResponse.json({ error: 'Invalid Google token' }, { status: 400 });
      }
      const payloadJson = Buffer.from(parts[1], 'base64').toString('utf8');
      const payload = JSON.parse(payloadJson);

      if (!payload.sub || !payload.email) {
        return NextResponse.json({ error: 'Incomplete Google profile' }, { status: 400 });
      }

      user = {
        id: payload.sub,
        email: payload.email,
        name: payload.name || payload.email.split('@')[0],
        picture: payload.picture,
      };
    } else if (demoUser) {
      // Developer / Sandbox account for fast local testing
      user = {
        id: demoUser.id || 'usr-demo-dr-vance',
        email: demoUser.email || 'dr.vance@meducid.internal',
        name: demoUser.name || 'Dr. Arthur Vance (Clinician)',
        picture: demoUser.picture || '',
      };
    } else {
      return NextResponse.json({ error: 'Missing credential or demo payload' }, { status: 400 });
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
  } catch (error: any) {
    console.error('Google Auth Route Error:', error);
    return NextResponse.json(
      { error: error.message || 'Authentication failed' },
      { status: 500 }
    );
  }
}
