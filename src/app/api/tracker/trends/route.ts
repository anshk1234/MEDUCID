import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authSession';
import { queryD1 } from '@/lib/cloudflareD1';

interface RawBiomarkerPoint {
  test_name: string;
  unit: string;
  reference_range: string;
  original_value: string;
  numeric_value: number | null;
  flag: 'NORMAL' | 'HIGH' | 'LOW';
  collection_date: string;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const rows = await queryD1<RawBiomarkerPoint>(
      `SELECT test_name, unit, reference_range, original_value, numeric_value, flag, collection_date
       FROM tracked_biomarkers
       WHERE user_id = ? AND numeric_value IS NOT NULL
       ORDER BY collection_date ASC, created_at ASC;`,
      [user.id]
    );

    // Group by test_name
    const metricMap = new Map<string, {
      name: string;
      unit: string;
      range: string;
      description: string;
      points: Array<{ date: string; value: number; flag: 'NORMAL' | 'HIGH' | 'LOW' }>;
    }>();

    for (const r of rows) {
      if (!metricMap.has(r.test_name)) {
        metricMap.set(r.test_name, {
          name: r.test_name,
          unit: r.unit,
          range: r.reference_range,
          description: `Longitudinal measurements for ${r.test_name}.`,
          points: [],
        });
      }
      metricMap.get(r.test_name)!.points.push({
        date: r.collection_date || 'Visit',
        value: r.numeric_value!,
        flag: r.flag || 'NORMAL',
      });
    }

    const trends = Array.from(metricMap.values());
    return NextResponse.json({ trends });
  } catch (error: any) {
    console.error('Error fetching trends from Cloudflare D1:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
