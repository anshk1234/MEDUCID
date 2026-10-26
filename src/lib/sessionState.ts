import { SimplifiedReport } from '@/types/report';

export interface UserSessionState {
  sessionId: string;
  stage: 'landing' | 'processing' | 'workspace';
  report: SimplifiedReport | null;
  fileInfo?: {
    fileName: string;
    fileType: string;
    previewUrl?: string;
    fileBase64?: string;
  };
  lastUpdated: string;
}

const SESSION_KEY = 'meducid_user_session';

/**
 * Returns or creates a unique session ID for the active browser session
 */
export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') {
    return 'srv-sess-default';
  }

  try {
    let sessId = sessionStorage.getItem('meducid_session_id');
    if (!sessId) {
      sessId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem('meducid_session_id', sessId);
    }
    return sessId;
  } catch {
    return `sess_fallback_${Date.now()}`;
  }
}

/**
 * Saves the active report and workspace state into browser sessionStorage
 * strictly scoped to this user's tab/session
 */
export function saveUserSession(
  report: SimplifiedReport | null,
  fileInfo?: {
    fileName: string;
    fileType: string;
    previewUrl?: string;
    fileBase64?: string;
  },
  stage: 'landing' | 'processing' | 'workspace' = 'workspace'
): void {
  if (typeof window === 'undefined') return;

  try {
    const sessionId = getOrCreateSessionId();
    const state: UserSessionState = {
      sessionId,
      stage,
      report,
      fileInfo: fileInfo
        ? {
            fileName: fileInfo.fileName,
            fileType: fileInfo.fileType,
            previewUrl: fileInfo.previewUrl,
            fileBase64: fileInfo.fileBase64,
          }
        : undefined,
      lastUpdated: new Date().toISOString(),
    };

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('[SessionState] Failed to persist session state:', e);
  }
}

/**
 * Loads the active report and workspace state from browser sessionStorage
 */
export function loadUserSession(): UserSessionState | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const parsed: UserSessionState = JSON.parse(raw);
    if (!parsed || !parsed.report) return null;

    // If PDF preview URL was a blob URL, recreate it from base64 if available
    if (parsed.fileInfo && parsed.fileInfo.fileType === 'pdf' && parsed.fileInfo.fileBase64) {
      try {
        const byteCharacters = atob(parsed.fileInfo.fileBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        parsed.fileInfo.previewUrl = URL.createObjectURL(blob);
      } catch (blobErr) {
        console.warn('[SessionState] Could not recreate PDF blob URL from stored base64:', blobErr);
      }
    }

    return parsed;
  } catch (e) {
    console.warn('[SessionState] Failed to read session state:', e);
    return null;
  }
}

/**
 * Clears the session state when the user starts a new report or clears data
 */
export function clearUserSession(): void {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch (e) {
    console.warn('[SessionState] Failed to clear session state:', e);
  }
}
