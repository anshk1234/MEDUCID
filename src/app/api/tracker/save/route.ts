import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authSession';
import { executeD1 } from '@/lib/cloudflareD1';
import { SimplifiedReport } from '@/types/report';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const body = await req.json();
    const report: SimplifiedReport = body.report;

    if (!report || !report.findings) {
      return NextResponse.json({ error: 'Invalid report data' }, { status: 400 });
    }

    const reportId = report.id || `rep-${Date.now()}`;
    const outOfRange = report.findings.filter(
      (f) => f.flag === 'HIGH' || f.flag === 'LOW'
    ).length;

    const collectionDate = report.collectionDate || new Date().toISOString().split('T')[0];

    // 1. Insert into tracked_reports
    await executeD1(
      `INSERT INTO tracked_reports (id, user_id, title, collection_date, panel_category, lab_name, total_tests, out_of_range_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         total_tests = excluded.total_tests,
         out_of_range_count = excluded.out_of_range_count;`,
      [
        reportId,
        user.id,
        report.title || 'Laboratory Report',
        collectionDate,
        report.panelCategory || 'General Laboratory',
        report.labName || 'Clinical Laboratory',
        report.findings.length,
        outOfRange,
      ]
    );

    // 2. Insert into tracked_biomarkers
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
          flag = excluded.flag;`,
        [
          biomarkerId,
          reportId,
          user.id,
          f.testName,
          f.simplifiedName || f.testName,
          f.category || 'General',
          f.originalValue,
          f.numericValue ?? null,
          f.unit || '',
          f.referenceRange || '',
          f.rangeLow ?? null,
          f.rangeHigh ?? null,
          f.flag || 'NORMAL',
          collectionDate,
        ]
      );
    }

    return NextResponse.json({ success: true, reportId });
  } catch (error: any) {
    console.error('Error saving report to Cloudflare D1:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
