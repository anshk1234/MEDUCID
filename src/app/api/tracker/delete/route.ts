import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authSession';
import { executeD1 } from '@/lib/cloudflareD1';
import { isValidSafeId } from '@/lib/validation';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reportId } = await req.json();
    if (!isValidSafeId(reportId)) {
      return NextResponse.json({ error: 'Invalid or missing reportId' }, { status: 400 });
    }

    const cleanId = reportId.trim();

    await executeD1(
      `DELETE FROM tracked_biomarkers WHERE report_id = ? AND user_id = ?;`,
      [cleanId, user.id]
    );

    await executeD1(
      `DELETE FROM tracked_reports WHERE id = ? AND user_id = ?;`,
      [cleanId, user.id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting report from Cloudflare D1:', error);
    return NextResponse.json({ error: 'Failed to delete report.' }, { status: 500 });
  }
}
