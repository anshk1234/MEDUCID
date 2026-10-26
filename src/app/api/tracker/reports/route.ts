import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authSession';
import { queryD1 } from '@/lib/cloudflareD1';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const reports = await queryD1(
      `SELECT id, title, collection_date as date, panel_category as category,
              total_tests as totalTests, out_of_range_count as outOfRangeCount,
              'Reviewed' as status
       FROM tracked_reports
       WHERE user_id = ?
       ORDER BY created_at DESC;`,
      [user.id]
    );

    return NextResponse.json({ reports });
  } catch (error: any) {
    console.error('Error fetching tracked reports:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
