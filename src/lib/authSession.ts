import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import crypto from 'crypto';

export interface AuthUser {
  id: string; // Google sub ID or email
  email: string;
  name: string;
  picture?: string;
}

interface SignedSessionPayload extends AuthUser {
  iat: number;
  exp: number;
}

const SESSION_COOKIE_NAME = 'meducid_session';
const THIRTY_DAYS_SEC = 30 * 24 * 60 * 60;
const THIRTY_DAYS_MS = THIRTY_DAYS_SEC * 1000;

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (secret && secret.length >= 16) {
    return secret;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET environment variable must be configured with at least 16 characters in production.');
  }
  // Development/test-only fallback so local tests run without .env.local
  return secret || 'meducid-dev-only-session-secret-not-for-prod';
}

function sign(payload: string): string {
  const hmac = crypto.createHmac('sha256', getSessionSecret());
  hmac.update(payload);
  return hmac.digest('hex');
}

export function encodeSession(user: AuthUser): string {
  const now = Date.now();
  const payload: SignedSessionPayload = {
    id: user.id,
    email: user.email,
    name: user.name,
    picture: user.picture,
    iat: now,
    exp: now + THIRTY_DAYS_MS,
  };
  const json = JSON.stringify(payload);
  const base64 = Buffer.from(json).toString('base64url');
  const signature = sign(base64);
  return `${base64}.${signature}`;
}

export function decodeSession(token: string): AuthUser | null {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [base64, signature] = parts;
    if (!base64 || !signature || !/^[0-9a-f]+$/i.test(signature)) return null;

    const expectedSig = sign(base64);
    const sigBuf = Buffer.from(signature, 'hex');
    const expectedBuf = Buffer.from(expectedSig, 'hex');
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }

    const json = Buffer.from(base64, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as Partial<SignedSessionPayload>;

    if (!parsed.id || !parsed.email || typeof parsed.exp !== 'number') {
      return null;
    }
    if (Date.now() > parsed.exp) {
      return null;
    }

    return {
      id: String(parsed.id),
      email: String(parsed.email),
      name: String(parsed.name || parsed.email.split('@')[0]),
      picture: parsed.picture ? String(parsed.picture) : undefined,
    };
  } catch {
    return null;
  }
}

export function getSafeBaseUrl(req: NextRequest): string {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, '');
  }

  const rawHost = req.headers.get('host') || 'localhost:3000';
  const allowedHosts = new Set([
    'localhost:3000',
    '127.0.0.1:3000',
    '172.16.95.112:3000',
    ...(process.env.ALLOWED_HOSTS?.split(',').map((h) => h.trim()).filter(Boolean) || []),
  ]);

  const isAllowed =
    allowedHosts.has(rawHost) ||
    /^[a-z0-9-]+\.vercel\.app$/i.test(rawHost);

  const safeHost = isAllowed ? rawHost : 'localhost:3000';
  const protoHeader = req.headers.get('x-forwarded-proto');
  const proto =
    protoHeader === 'https' || (!safeHost.includes('localhost') && !safeHost.startsWith('127.0.0.1') && !safeHost.startsWith('172.16.'))
      ? 'https'
      : 'http';

  return `${proto}://${safeHost}`;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return decodeSession(token);
  } catch {
    return null;
  }
}

export async function setSessionCookie(user: AuthUser): Promise<void> {
  const cookieStore = await cookies();
  const token = encodeSession(user);
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: THIRTY_DAYS_SEC,
    path: '/',
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
