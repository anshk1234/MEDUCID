import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authSession';
import { executeD1, queryD1 } from '@/lib/cloudflareD1';
import { validateTrackerSavePayload } from '@/lib/validation';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const body = await req.json();
    const validation = validateTrackerSavePayload(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const report = validation.report;
    const reportId = report.id;

    // Prevent IDOR: verify an existing reportId belongs to the authenticated user
    const existing = await queryD1<{ user_id: string }>(
      `SELECT user_id FROM tracked_reports WHERE id = ? LIMIT 1;`,
      [reportId]
    );
    if (existing.length > 0 && existing[0].user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden: access denied for this report ID.' }, { status: 403 });
    }

    const outOfRange = report.findings.filter(
      (f) => f.flag === 'HIGH' || f.flag === 'LOW'
    ).length;

    // 1. Insert into tracked_reports (ownership enforced in WHERE clause on conflict)
    await executeD1(
      `INSERT INTO tracked_reports (id, user_id, title, collection_date, panel_category, lab_name, total_tests, out_of_range_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         total_tests = excluded.total_tests,
         out_of_range_count = excluded.out_of_range_count
       WHERE tracked_reports.user_id = excluded.user_id;`,
      [
        reportId,
        user.id,
        report.title,
        report.collectionDate,
        report.panelCategory,
        report.labName,
        report.findings.length,
        outOfRange,
      ]
    );

    // 2. Insert into tracked_biomarkers (ownership enforced in WHERE clause on conflict)
    for (const f of report.findings) {
      const biomarkerId = `bmk-${reportId}-${f.id}`;
      await executeD1(
        `INSERT INTO tracked_biomarkers (
          id, report_id, user_id, test_name, simplified_name, category,
          original_value, numeric_value, unit, reference_range,
          range_low, range_high, flag, collection_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          original_value = excluded.original_value,
          numeric_value = excluded.numeric_value,
          flag = excluded.flag
        WHERE tracked_biomarkers.user_id = excluded.user_id;`,
        [
          biomarkerId,
          reportId,
          user.id,
          f.testName,
          f.simplifiedName,
          f.category,
          f.originalValue,
          f.numericValue,
          f.unit,
          f.referenceRange,
          f.rangeLow,
          f.rangeHigh,
          f.flag,
          report.collectionDate,
        ]
      );
    }

    return NextResponse.json({ success: true, reportId });
  } catch (error) {
    console.error('Error saving report to Cloudflare D1:', error);
    return NextResponse.json({ error: 'Failed to save report.' }, { status: 500 });
  }
}
