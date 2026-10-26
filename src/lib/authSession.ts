import { cookies } from 'next/headers';
import crypto from 'crypto';

export interface AuthUser {
  id: string; // Google sub ID or email
  email: string;
  name: string;
  picture?: string;
}

const SESSION_COOKIE_NAME = 'meducid_session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'meducid-secure-session-key-2026-edge';
const THIRTY_DAYS_SEC = 30 * 24 * 60 * 60;

function sign(payload: string): string {
  const hmac = crypto.createHmac('sha256', SESSION_SECRET);
  hmac.update(payload);
  return hmac.digest('hex');
}

export function encodeSession(user: AuthUser): string {
  const json = JSON.stringify(user);
  const base64 = Buffer.from(json).toString('base64url');
  const signature = sign(base64);
  return `${base64}.${signature}`;
}

export function decodeSession(token: string): AuthUser | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [base64, signature] = parts;
    const expectedSig = sign(base64);
    if (signature !== expectedSig) return null;
    const json = Buffer.from(base64, 'base64url').toString('utf8');
    return JSON.parse(json) as AuthUser;
  } catch {
    return null;
  }
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
