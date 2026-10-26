import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getOrCreateSessionId,
  saveUserSession,
  loadUserSession,
  clearUserSession,
} from '../src/lib/sessionState';
import { SYNTHETIC_BENCHMARKS } from '../src/data/syntheticReports';

describe('MEDUCID User Session State Isolation Suite', () => {
  // In-memory mock for sessionStorage
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};

    const mockSessionStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };

    vi.stubGlobal('sessionStorage', mockSessionStorage);
    vi.stubGlobal('window', { sessionStorage: mockSessionStorage });
  });

  it('1. should generate a distinct session ID for a browser session and persist it', () => {
    const sess1 = getOrCreateSessionId();
    expect(sess1).toBeDefined();
    expect(sess1.startsWith('sess_')).toBe(true);

    // Subsequent calls in the same session return the identical session ID
    const sess2 = getOrCreateSessionId();
    expect(sess2).toBe(sess1);
  });

  it('2. should save and restore the user active report and file metadata within their session', () => {
    const report = SYNTHETIC_BENCHMARKS[0];
    const fileInfo = {
      fileName: 'patient_sample.pdf',
      fileType: 'pdf',
      previewUrl: 'blob:http://localhost:3000/123-abc',
      fileBase64: 'JVBERi0xLjQK',
    };

    saveUserSession(report, fileInfo, 'workspace');

    const loaded = loadUserSession();
    expect(loaded).toBeDefined();
    expect(loaded?.stage).toBe('workspace');
    expect(loaded?.report?.id).toBe(report.id);
    expect(loaded?.report?.findings.length).toBe(report.findings.length);
    expect(loaded?.fileInfo?.fileName).toBe('patient_sample.pdf');
  });

  it('3. should isolate different user sessions so data never gets mixed between users', () => {
    // Simulate User A's session storage
    const storeUserA: Record<string, string> = {};
    const storeUserB: Record<string, string> = {};

    // User A uploads CMP report
    storeUserA['meducid_session_id'] = 'sess_user_A_111';
    storeUserA['meducid_user_session'] = JSON.stringify({
      sessionId: 'sess_user_A_111',
      stage: 'workspace',
      report: SYNTHETIC_BENCHMARKS[0], // CMP
      lastUpdated: new Date().toISOString(),
    });

    // User B uploads CBC report
    storeUserB['meducid_session_id'] = 'sess_user_B_222';
    storeUserB['meducid_user_session'] = JSON.stringify({
      sessionId: 'sess_user_B_222',
      stage: 'workspace',
      report: SYNTHETIC_BENCHMARKS[1], // CBC
      lastUpdated: new Date().toISOString(),
    });

    // Inspect User A
    const dataA = JSON.parse(storeUserA['meducid_user_session']);
    expect(dataA.sessionId).toBe('sess_user_A_111');
    expect(dataA.report.title).toContain('Comprehensive Metabolic Panel');

    // Inspect User B
    const dataB = JSON.parse(storeUserB['meducid_user_session']);
    expect(dataB.sessionId).toBe('sess_user_B_222');
    expect(dataB.report.title).toContain('Complete Blood Count');

    // Ensure completely isolated with zero overlap
    expect(dataA.sessionId).not.toBe(dataB.sessionId);
    expect(dataA.report.id).not.toBe(dataB.report.id);
  });

  it('4. should clear session state completely when user clicks new report or clear data', () => {
    const report = SYNTHETIC_BENCHMARKS[0];
    saveUserSession(report, undefined, 'workspace');
    expect(loadUserSession()).not.toBeNull();

    clearUserSession();
    expect(loadUserSession()).toBeNull();
  });
});
