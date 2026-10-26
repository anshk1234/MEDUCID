import { SimplifiedReport } from '@/types/report';
import { getOrCreateSessionId } from './sessionState';

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_PDF_PAGES = 10;

let pdfJsLoadPromise: Promise<void> | null = null;

/**
 * Singleton loader for PDF.js library to prevent race conditions or duplicate script injection
 */
export function loadPdfJsLibrary(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if ((window as any).pdfjsLib) return Promise.resolve();
  if (pdfJsLoadPromise) return pdfJsLoadPromise;

  pdfJsLoadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[src*="pdf.min.js"]');
    if (existing) {
      if ((window as any).pdfjsLib) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => {
        pdfJsLoadPromise = null;
        reject(new Error('Failed to load PDF.js from CDN'));
      });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
      if (pdfjsLib) {
        try {
          const workerBlob = new Blob(
            [`importScripts('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js');`],
            { type: 'application/javascript' }
          );
          pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(workerBlob);
        } catch {
          pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
      }
      resolve();
    };
    script.onerror = () => {
      pdfJsLoadPromise = null;
      reject(new Error('Failed to load PDF.js from CDN'));
    };
    document.head.appendChild(script);
  });

  return pdfJsLoadPromise;
}

export const SUPPORTED_EXTENSIONS = [
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.heic',
  '.txt',
  '.docx',
];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export interface PreparedUpload {
  fileName: string;
  fileType: 'pdf' | 'image' | 'text' | 'docx';
  mimeType: string;
  fileBase64?: string;
  rawText?: string;
  previewUrl?: string;
}

/**
 * Validates uploaded file type, size, and integrity
 */
export function validateUploadFile(file: File): FileValidationResult {
  if (!file) {
    return { valid: false, error: 'No file provided.' };
  }

  if (file.size === 0) {
    return { valid: false, error: 'The selected file is empty (0 bytes). Please upload a valid laboratory report.' };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: 'File size exceeds the 10 MB limit. Please select a smaller file.' };
  }

  const nameLower = file.name.toLowerCase();
  const hasSupportedExt = SUPPORTED_EXTENSIONS.some((ext) => nameLower.endsWith(ext));

  if (!hasSupportedExt) {
    return {
      valid: false,
      error: 'Unsupported file format. Accepted formats: PDF, PNG, JPG, JPEG, WEBP, HEIC, TXT, DOCX.',
    };
  }

  return { valid: true };
}

/**
 * Converts File to Base64 data string (without prefix)
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Extracts raw textual lines from PDF using PDF.js in browser or binary stream scanner
 */
export async function extractPdfText(file: File | ArrayBuffer): Promise<string> {
  const arrayBuffer = file instanceof ArrayBuffer ? file : await file.arrayBuffer();

  // 1. In browser environment: Use PDF.js for exact coordinate-based text reconstruction
  if (typeof window !== 'undefined') {
    try {
      await loadPdfJsLibrary();
      const pdfjsLib = (window as any).pdfjsLib;

      const pdf = await Promise.race([
        pdfjsLib.getDocument({ data: arrayBuffer }).promise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('PDF.js loading timed out')), 6000)
        ),
      ]);
      const pages: string[] = [];

      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const textContent = await page.getTextContent();

        // Group items by vertical position into lines
        const lineMap = new Map<number, Array<{ str: string; x: number; width: number }>>();

        for (const item of textContent.items as any[]) {
          const str = (item.str || '').trim();
          if (!str) continue;
          const y = Math.round(item.transform[5]);
          const x = Math.round(item.transform[4]);
          const width = typeof item.width === 'number' && item.width > 0 ? Math.round(item.width) : Math.round(str.length * 6);

          let bucket: number | null = null;
          for (const key of lineMap.keys()) {
            if (Math.abs(key - y) <= 4) {
              bucket = key;
              break;
            }
          }
          if (bucket === null) {
            bucket = y;
            lineMap.set(y, []);
          }
          lineMap.get(bucket)!.push({ str: item.str, x, width });
        }

        // Sort lines top to bottom (y descending)
        const sortedY = Array.from(lineMap.keys()).sort((a, b) => b - a);
        const pageLines: string[] = [];

        for (const y of sortedY) {
          const items = lineMap.get(y)!;
          // Sort items on same line left to right
          items.sort((a, b) => a.x - b.x);

          let lineStr = '';
          let lastX = -1;
          let lastWidth = 0;

          for (const item of items) {
            if (lastX >= 0) {
              const gap = item.x - (lastX + lastWidth);
              if (gap > 12) {
                lineStr += '   '; // Preserve tabular column gap
              } else if (gap > 1.5) {
                lineStr += ' ';
              }
            }
            lineStr += item.str;
            lastX = item.x;
            lastWidth = item.width || Math.round(item.str.length * 6);
          }

          pageLines.push(lineStr);
        }

        pages.push(pageLines.join('\n'));
      }

      const fullText = pages.join('\n\n');
      if (fullText.trim().length > 0) return fullText;
    } catch (e) {
      console.warn('[PDF Extractor] PDF.js extraction failed, falling back to binary scan:', e);
    }
  }

  // 2. Binary stream scanner fallback (works in Node.js / offline)
  try {
    const bytes = new Uint8Array(arrayBuffer);
    const latin1 = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
    const textChunks: string[] = [];

    // Extract uncompressed literal strings
    const tjRegex = /\(([^)]+)\)\s*(?:Tj|'|")/g;
    let match;
    while ((match = tjRegex.exec(latin1)) !== null) {
      const s = match[1].trim();
      if (s.length > 0) {
        textChunks.push(s);
      }
    }

    if (textChunks.length > 5) {
      return textChunks.join('\n');
    }
  } catch {}

  return '';
}

/**
 * Prepares file data for AI extraction and local document preview
 */
export async function prepareFileForExtraction(file: File): Promise<PreparedUpload> {
  const nameLower = file.name.toLowerCase();

  // 1. Text Files (.txt)
  if (nameLower.endsWith('.txt')) {
    const text = await file.text();
    return {
      fileName: file.name,
      fileType: 'text',
      mimeType: 'text/plain',
      rawText: text,
    };
  }

  // 2. PDF Files (.pdf)
  if (nameLower.endsWith('.pdf')) {
    const fileBase64 = await fileToBase64(file);
    const previewUrl = URL.createObjectURL(file);
    let rawText: string | undefined;
    try {
      rawText = (await extractPdfText(file)) || undefined;
    } catch (e) {
      console.warn('PDF text extraction error, proceeding with binary/AI fallback:', e);
    }
    return {
      fileName: file.name,
      fileType: 'pdf',
      mimeType: 'application/pdf',
      fileBase64,
      previewUrl,
      rawText,
    };
  }

  // 3. Images (.png, .jpg, .jpeg, .webp, .heic)
  if (
    nameLower.endsWith('.png') ||
    nameLower.endsWith('.jpg') ||
    nameLower.endsWith('.jpeg') ||
    nameLower.endsWith('.webp') ||
    nameLower.endsWith('.heic')
  ) {
    const fileBase64 = await fileToBase64(file);
    const previewUrl = URL.createObjectURL(file);
    let mimeType = file.type || 'image/png';
    if (nameLower.endsWith('.jpg') || nameLower.endsWith('.jpeg')) mimeType = 'image/jpeg';
    if (nameLower.endsWith('.webp')) mimeType = 'image/webp';

    return {
      fileName: file.name,
      fileType: 'image',
      mimeType,
      fileBase64,
      previewUrl,
    };
  }

  // 4. DOCX Files
  if (nameLower.endsWith('.docx')) {
    const fileBase64 = await fileToBase64(file);
    return {
      fileName: file.name,
      fileType: 'docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      fileBase64,
    };
  }

  throw new Error('Unsupported document format.');
}

/**
 * Calls Next.js /api/extract with automatic Gemini API key rotation
 */
export async function requestAiExtraction(payload: {
  fileBase64?: string;
  mimeType?: string;
  rawText?: string;
  fileName?: string;
}): Promise<{ report: SimplifiedReport; modelUsed: string; keyIndexUsed: number }> {
  const sessionId = getOrCreateSessionId();

  const res = await fetch('/api/extract', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-ID': sessionId,
    },
    body: JSON.stringify({
      ...payload,
      sessionId,
    }),
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Gemini extraction failed.');
  }

  return {
    report: data.report,
    modelUsed: data.modelUsed,
    keyIndexUsed: data.keyIndexUsed,
  };
}
