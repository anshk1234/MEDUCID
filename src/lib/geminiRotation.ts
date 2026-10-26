export const GEMINI_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-2.5-flash',
];

export const FALLBACK_KEYS: string[] = [];

// In-memory key and model rotation index
let currentKeyIndex = 0;
let currentModelIndex = 0;

export function getApiKeys(): string[] {
  const envKeys = process.env.GEMINI_API_KEYS;
  if (envKeys) {
    const list = envKeys.split(',').map((k) => k.trim()).filter(Boolean);
    if (list.length > 0) return list;
  }
  return FALLBACK_KEYS;
}

export function getCurrentKey(): string {
  const keys = getApiKeys();
  if (keys.length === 0) return '';
  return keys[currentKeyIndex % keys.length];
}

export function getCurrentModel(): string {
  return GEMINI_MODELS[currentModelIndex % GEMINI_MODELS.length];
}

export function rotateKey(): { key: string; keyIndex: number; rotatedModel: boolean; model: string } {
  const keys = getApiKeys();
  if (keys.length === 0) return { key: '', keyIndex: 0, rotatedModel: false, model: getCurrentModel() };
  currentKeyIndex = (currentKeyIndex + 1) % keys.length;
  let rotatedModel = false;

  // If we cycled through all keys, rotate the model
  if (currentKeyIndex === 0) {
    currentModelIndex = (currentModelIndex + 1) % GEMINI_MODELS.length;
    rotatedModel = true;
    console.warn(`[Gemini Rotation] All keys cycled. Switching model to: ${getCurrentModel()}`);
  }

  console.warn(`[Gemini Rotation] Rotated to Key #${currentKeyIndex + 1} (${getCurrentKey().substring(0, 8)}...), Model: ${getCurrentModel()}`);
  return {
    key: getCurrentKey(),
    keyIndex: currentKeyIndex,
    rotatedModel,
    model: getCurrentModel(),
  };
}

export interface GeminiContentPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string; // base64
  };
}

/**
 * Calls Gemini with automatic key rotation and model fallback on 429/403/ResourceExhausted
 */
export async function callGeminiWithRotation(
  parts: GeminiContentPart[],
  systemInstruction?: string
): Promise<{ text: string; modelUsed: string; keyIndexUsed: number }> {
  const keys = getApiKeys();
  const maxAttempts = keys.length * GEMINI_MODELS.length;
  let attempts = 0;
  let lastError: any = null;

  while (attempts < maxAttempts) {
    const key = getCurrentKey();
    const model = getCurrentModel();
    attempts++;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

      const requestBody: any = {
        contents: [
          {
            role: 'user',
            parts,
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      };

      if (systemInstruction) {
        requestBody.systemInstruction = {
          parts: [{ text: systemInstruction }],
        };
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.warn(`[Gemini] HTTP ${res.status} from ${model} using key #${currentKeyIndex + 1}: ${errorText.substring(0, 150)}`);

        // Check if rate limit, quota exceeded, or model not found
        if (res.status === 429 || res.status === 403 || errorText.includes('RESOURCE_EXHAUSTED') || errorText.includes('quota')) {
          rotateKey();
          continue;
        }

        if (res.status === 404 || res.status === 503) {
          // Model unavailable on this tier, switch model
          currentModelIndex = (currentModelIndex + 1) % GEMINI_MODELS.length;
          console.warn(`[Gemini] Model ${model} unavailable. Switched to ${getCurrentModel()}`);
          continue;
        }

        // For any other non-OK status (e.g. 400 invalid key, 500 server error), rotate key
        rotateKey();
        continue;
      }

      const data = await res.json();
      const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!candidateText) {
        throw new Error('Gemini returned an empty response candidate.');
      }

      return {
        text: candidateText,
        modelUsed: model,
        keyIndexUsed: currentKeyIndex,
      };
    } catch (err: any) {
      lastError = err;
      if (err.message?.includes('fetch failed') || err.message?.includes('quota') || err.message?.includes('429')) {
        rotateKey();
        continue;
      }
      // If other error, also rotate key and attempt again
      rotateKey();
    }
  }

  throw new Error(`All Gemini API keys and model fallbacks exhausted. Last error: ${lastError?.message || 'Rate limit'}`);
}
