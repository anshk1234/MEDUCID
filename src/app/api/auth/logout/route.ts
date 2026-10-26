import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/authSession';

export async function POST() {
  try {
    await clearSessionCookie();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
