import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { encodeSession, decodeSession, AuthUser } from '../src/lib/authSession';
import {
  validateTrackerSavePayload,
  isValidSafeId,
  checkRateLimit,
  resetRateLimitStore,
} from '../src/lib/validation';

// Mock next/headers cookies for API route boundary tests
const mockCookieGet = vi.fn();
const mockCookieSet = vi.fn();
const mockCookieDelete = vi.fn();

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: mockCookieGet,
    set: mockCookieSet,
    delete: mockCookieDelete,
  }),
}));

// Mock Cloudflare D1 client for IDOR and route tests
const mockQueryD1 = vi.fn();
const mockExecuteD1 = vi.fn();
vi.mock('../src/lib/cloudflareD1', () => ({
  queryD1: (...args: any[]) => mockQueryD1(...args),
  executeD1: (...args: any[]) => mockExecuteD1(...args),
}));

describe('Security Hardening: Session Integrity', () => {
  const sampleUser: AuthUser = {
    id: 'usr-123',
    email: 'patient@example.com',
    name: 'Test Patient',
  };

  it('encodes and decodes a valid session token', () => {
    const token = encodeSession(sampleUser);
    const decoded = decodeSession(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.id).toBe(sampleUser.id);
    expect(decoded?.email).toBe(sampleUser.email);
  });

  it('rejects a tampered payload in a session token', () => {
    const token = encodeSession(sampleUser);
    const [, sig] = token.split('.');
    const forgedPayload = Buffer.from(
      JSON.stringify({ id: 'admin-999', email: 'admin@example.com', exp: Date.now() + 100000 })
    ).toString('base64url');
    expect(decodeSession(`${forgedPayload}.${sig}`)).toBeNull();
  });

  it('rejects a tampered or non-hex signature', () => {
    const token = encodeSession(sampleUser);
    const [payload, sig] = token.split('.');
    const flippedSig = (sig[0] === 'a' ? 'b' : 'a') + sig.slice(1);
    expect(decodeSession(`${payload}.${flippedSig}`)).toBeNull();
    expect(decodeSession(`${payload}.not-hex-!@#`)).toBeNull();
    expect(decodeSession('malformed-token-without-dot')).toBeNull();
  });

  it('rejects an expired session token', () => {
    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValue(1_000_000);
    const token = encodeSession(sampleUser);

    // Advance clock past 30 days
    nowSpy.mockReturnValue(1_000_000 + 31 * 24 * 60 * 60 * 1000);
    expect(decodeSession(token)).toBeNull();
    nowSpy.mockRestore();
  });
});

describe('Security Hardening: Input Validation & SQLi Resilience', () => {
  it('rejects SQL injection and path traversal characters in IDs', () => {
    expect(isValidSafeId("rep-123' OR 1=1 --")).toBe(false);
    expect(isValidSafeId('../../etc/passwd')).toBe(false);
    expect(isValidSafeId('rep-valid_123')).toBe(true);
  });

  it('rejects tracker save payloads with invalid IDs or oversized findings arrays', () => {
    const badIdResult = validateTrackerSavePayload({
      report: {
        id: "1'; DROP TABLE tracked_reports;--",
        findings: [{ testName: 'Glucose', originalValue: '95' }],
      },
    });
    expect(badIdResult.valid).toBe(false);

    const tooManyFindings = Array.from({ length: 201 }, (_, i) => ({
      testName: `Test ${i}`,
      originalValue: '10',
    }));
    const overflowResult = validateTrackerSavePayload({
      report: { id: 'rep-1', findings: tooManyFindings },
    });
    expect(overflowResult.valid).toBe(false);
  });

  it('accepts and normalizes valid tracker save payloads', () => {
    const result = validateTrackerSavePayload({
      report: {
        id: 'rep-abc-123',
        title: 'CMP Panel',
        findings: [
          {
            id: 'f-1',
            testName: 'Glucose',
            originalValue: '92',
            numericValue: 92,
            unit: 'mg/dL',
            referenceRange: '70 - 99',
            flag: 'NORMAL',
          },
        ],
      },
    });
    expect(result.valid).toBe(true);
  });
});

describe('Security Hardening: Auth Boundaries & IDOR Prevention', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimitStore();
    mockCookieGet.mockReturnValue(undefined);
  });

  it('rejects unauthenticated requests to all /api/tracker/* routes with 401', async () => {
    const { GET: getReports } = await import('../src/app/api/tracker/reports/route');
    const { GET: getTrends } = await import('../src/app/api/tracker/trends/route');
    const { POST: saveReport } = await import('../src/app/api/tracker/save/route');
    const { POST: deleteReport } = await import('../src/app/api/tracker/delete/route');

    const resReports = await getReports();
    expect(resReports.status).toBe(401);

    const resTrends = await getTrends();
    expect(resTrends.status).toBe(401);

    const saveReq = new NextRequest('http://localhost:3000/api/tracker/save', {
      method: 'POST',
      body: JSON.stringify({ report: { findings: [{ testName: 'Hb', originalValue: '14' }] } }),
    });
    expect((await saveReport(saveReq)).status).toBe(401);

    const delReq = new NextRequest('http://localhost:3000/api/tracker/delete', {
      method: 'POST',
      body: JSON.stringify({ reportId: 'rep-1' }),
    });
    expect((await deleteReport(delReq)).status).toBe(401);
  });

  it('blocks IDOR overwrite when saving a reportId owned by another user (403)', async () => {
    const attackerToken = encodeSession({
      id: 'attacker-user',
      email: 'attacker@example.com',
      name: 'Attacker',
    });
    mockCookieGet.mockReturnValue({ value: attackerToken });
    mockQueryD1.mockResolvedValueOnce([{ user_id: 'victim-user' }]);

    const { POST: saveReport } = await import('../src/app/api/tracker/save/route');
    const req = new NextRequest('http://localhost:3000/api/tracker/save', {
      method: 'POST',
      body: JSON.stringify({
        report: {
          id: 'victim-report-1',
          findings: [{ id: 'f1', testName: 'Glucose', originalValue: '999', flag: 'HIGH' }],
        },
      }),
    });

    const res = await saveReport(req);
    expect(res.status).toBe(403);
    expect(mockExecuteD1).not.toHaveBeenCalled();
  });

  it('blocks demoUser authentication bypass in /api/auth/google', async () => {
    const { POST: googleAuth } = await import('../src/app/api/auth/google/route');
    const req = new NextRequest('http://localhost:3000/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ demoUser: { id: 'victim-user', email: 'victim@example.com' } }),
    });
    const res = await googleAuth(req);
    expect(res.status).toBe(403);
  });
});

describe('Security Hardening: Rate Limiting & Server-Side Upload Checks', () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  it('enforces sliding-window rate limits', () => {
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit('test:1.2.3.4', 3, 60_000).allowed).toBe(true);
    }
    const blocked = checkRateLimit('test:1.2.3.4', 3, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThanOrEqual(1);
  });

  it('rejects spoofed binary magic bytes in /api/extract', async () => {
    const { POST: extractPost } = await import('../src/app/api/extract/route');
    // MZ executable header disguised as application/pdf
    const exeHeaderBase64 = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]).toString('base64');
    const req = new NextRequest('http://localhost:3000/api/extract', {
      method: 'POST',
      body: JSON.stringify({
        fileBase64: exeHeaderBase64,
        mimeType: 'application/pdf',
        fileName: 'malicious.pdf',
      }),
    });

    const res = await extractPost(req);
    expect(res.status).toBe(400);
  });
});
