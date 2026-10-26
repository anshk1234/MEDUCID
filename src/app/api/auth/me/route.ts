import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authSession';

export async function GET() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ user: null });
  }
}
