/**
 * VinIQ — Client-side API caller
 * Calls VinIQ's own server-side API routes (/api/analyze-*).
 * No API key handling here — the key lives only on the server.
 */

export interface VisionApiResult {
  text: string;
  error?: string;
}

export type MediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

/** Client-side ceiling — the server route itself times out at 60s. */
const REQUEST_TIMEOUT_MS = 75_000;

export async function callVisionApi(
  endpoint: '/api/analyze-wine-list' | '/api/analyze-bottle' | '/api/analyze-promotion',
  imageBase64: string,
  mediaType: MediaType
): Promise<VisionApiResult> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, mediaType }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return { text: '', error: data.error ?? `Request failed (${response.status})` };
    }

    return { text: data.text ?? '' };
  } catch (err) {
    if (err instanceof DOMException && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
      return { text: '', error: 'The analysis timed out. Please try again — a clearer or smaller photo often helps.' };
    }
    return { text: '', error: err instanceof Error ? err.message : 'Network error' };
  }
}

/** Safely parse JSON from Claude's response (strips markdown fences) */
export function parseJsonResponse<T>(text: string): T | null {
  try {
    const clean = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
    return JSON.parse(clean) as T;
  } catch {
    return null;
  }
}
