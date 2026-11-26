import { NextRequest } from 'next/server';

export interface ValidatedFindingInput {
  id: string;
  testName: string;
  simplifiedName: string;
  category: string;
  originalValue: string;
  numericValue: number | null;
  unit: string;
  referenceRange: string;
  rangeLow: number | null;
  rangeHigh: number | null;
  flag: 'NORMAL' | 'HIGH' | 'LOW' | 'INCONCLUSIVE';
}

export interface ValidatedTrackerReportInput {
  id: string;
  title: string;
  collectionDate: string;
  panelCategory: string;
  labName: string;
  findings: ValidatedFindingInput[];
}

const VALID_FLAGS = new Set(['NORMAL', 'HIGH', 'LOW', 'INCONCLUSIVE']);
const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]{1,100}$/;
const MAX_FINDINGS_PER_REPORT = 200;

export function isValidSafeId(value: unknown): value is string {
  return typeof value === 'string' && SAFE_ID_REGEX.test(value.trim());
}

export function validateTrackerSavePayload(
  body: unknown
): { valid: true; report: ValidatedTrackerReportInput } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request payload.' };
  }

  const rawReport = (body as Record<string, unknown>).report;
  if (!rawReport || typeof rawReport !== 'object') {
    return { valid: false, error: 'Invalid report data.' };
  }

  const rep = rawReport as Record<string, unknown>;
  if (!Array.isArray(rep.findings) || rep.findings.length === 0) {
    return { valid: false, error: 'Report must contain at least one finding.' };
  }

  if (rep.findings.length > MAX_FINDINGS_PER_REPORT) {
    return { valid: false, error: `Report exceeds maximum of ${MAX_FINDINGS_PER_REPORT} findings.` };
  }

  let reportId = `rep-${Date.now()}`;
  if (rep.id !== undefined && rep.id !== null && rep.id !== '') {
    if (!isValidSafeId(rep.id)) {
      return { valid: false, error: 'Invalid report ID format.' };
    }
    reportId = rep.id.trim();
  }

  const title = typeof rep.title === 'string' && rep.title.trim() ? rep.title.trim().slice(0, 200) : 'Laboratory Report';
  const collectionDate =
    typeof rep.collectionDate === 'string' && rep.collectionDate.trim()
      ? rep.collectionDate.trim().slice(0, 50)
      : new Date().toISOString().split('T')[0];
  const panelCategory =
    typeof rep.panelCategory === 'string' && rep.panelCategory.trim()
      ? rep.panelCategory.trim().slice(0, 120)
      : 'General Laboratory';
  const labName =
    typeof rep.labName === 'string' && rep.labName.trim()
      ? rep.labName.trim().slice(0, 120)
      : 'Clinical Laboratory';

  const validatedFindings: ValidatedFindingInput[] = [];
  for (let i = 0; i < rep.findings.length; i++) {
    const rawF = rep.findings[i];
    if (!rawF || typeof rawF !== 'object') {
      return { valid: false, error: `Invalid finding at index ${i}.` };
    }
    const f = rawF as Record<string, unknown>;
    const testName = typeof f.testName === 'string' ? f.testName.trim().slice(0, 200) : '';
    const originalValue =
      typeof f.originalValue === 'string'
        ? f.originalValue.trim().slice(0, 100)
        : typeof f.originalValue === 'number'
        ? String(f.originalValue)
        : '';

    if (!testName || !originalValue) {
      return { valid: false, error: `Finding at index ${i} is missing testName or originalValue.` };
    }

    const fid = isValidSafeId(f.id) ? f.id.trim() : `f-${i + 1}`;
    const flagStr = typeof f.flag === 'string' ? f.flag.toUpperCase() : 'NORMAL';
    const flag = (VALID_FLAGS.has(flagStr) ? flagStr : 'NORMAL') as ValidatedFindingInput['flag'];

    const numericValue =
      typeof f.numericValue === 'number' && Number.isFinite(f.numericValue) ? f.numericValue : null;
    const rangeLow =
      typeof f.rangeLow === 'number' && Number.isFinite(f.rangeLow) ? f.rangeLow : null;
    const rangeHigh =
      typeof f.rangeHigh === 'number' && Number.isFinite(f.rangeHigh) ? f.rangeHigh : null;

    validatedFindings.push({
      id: fid,
      testName,
      simplifiedName:
        typeof f.simplifiedName === 'string' && f.simplifiedName.trim()
          ? f.simplifiedName.trim().slice(0, 200)
          : testName,
      category:
        typeof f.category === 'string' && f.category.trim()
          ? f.category.trim().slice(0, 100)
          : 'General',
      originalValue,
      numericValue,
      unit: typeof f.unit === 'string' ? f.unit.trim().slice(0, 60) : '',
      referenceRange: typeof f.referenceRange === 'string' ? f.referenceRange.trim().slice(0, 120) : '',
      rangeLow,
      rangeHigh,
      flag,
    });
  }

  return {
    valid: true,
    report: {
      id: reportId,
      title,
      collectionDate,
      panelCategory,
      labName,
      findings: validatedFindings,
    },
  };
}

// In-memory sliding-window rate limiter for API abuse & quota protection
const rateLimitStore = new Map<string, number[]>();

export function getClientIdentifier(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.headers.get('x-real-ip') || 'local';
  return ip;
}

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const cutoff = now - windowMs;

  // Periodic cleanup to avoid unbounded memory growth
  if (rateLimitStore.size > 5000) {
    for (const [k, timestamps] of rateLimitStore.entries()) {
      const recent = timestamps.filter((t) => t > cutoff);
      if (recent.length === 0) {
        rateLimitStore.delete(k);
      } else {
        rateLimitStore.set(k, recent);
      }
    }
  }

  const existing = (rateLimitStore.get(key) || []).filter((t) => t > cutoff);
  if (existing.length >= maxRequests) {
    const oldest = existing[0];
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    rateLimitStore.set(key, existing);
    return { allowed: false, retryAfterSec };
  }

  existing.push(now);
  rateLimitStore.set(key, existing);
  return { allowed: true, retryAfterSec: 0 };
}

export function resetRateLimitStore(): void {
  rateLimitStore.clear();
}
