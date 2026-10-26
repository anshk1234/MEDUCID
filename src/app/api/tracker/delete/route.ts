import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authSession';
import { executeD1 } from '@/lib/cloudflareD1';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reportId } = await req.json();
    if (!reportId) {
      return NextResponse.json({ error: 'Missing reportId' }, { status: 400 });
    }

    await executeD1(
      `DELETE FROM tracked_reports WHERE id = ? AND user_id = ?;`,
      [reportId, user.id]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
