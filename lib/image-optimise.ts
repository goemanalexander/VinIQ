/**
 * Client-side image optimisation — shared by all upload surfaces.
 * Extracted from ImageUploader (Sprint 8.1) when the multi-image promotion
 * flow (Sprint 10) became a second consumer. Browser-only: uses canvas/Image.
 */

export type MediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

// Claude Vision reads labels reliably at ~1600px on the longest side; anything
// larger only adds upload time. Payloads already below both limits are sent as-is.
const MAX_DIMENSION = 1600;
const MAX_BYTES = 1_500_000;
const JPEG_QUALITY = 0.85;

export function detectMediaType(dataUrl: string): MediaType {
  const header = dataUrl.slice(0, dataUrl.indexOf(','));
  if (header.includes('image/png')) return 'image/png';
  if (header.includes('image/webp')) return 'image/webp';
  if (header.includes('image/gif')) return 'image/gif';
  return 'image/jpeg';
}

export function approxBytes(dataUrl: string): number {
  return Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = dataUrl;
  });
}

/**
 * Downscales/re-encodes the image client-side when it is larger than the
 * vision model needs. Falls back to the original on any failure — a scan
 * must never be blocked by the optimisation step.
 */
export async function prepareImage(dataUrl: string): Promise<{ dataUrl: string; mediaType: MediaType }> {
  const original = { dataUrl, mediaType: detectMediaType(dataUrl) };
  try {
    const img = await loadImage(dataUrl);

    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
    const withinLimits = scale === 1 && original.mediaType === 'image/jpeg' && approxBytes(dataUrl) <= MAX_BYTES;
    if (withinLimits) return original;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return original;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const compressed = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    // Re-encoding a small PNG can occasionally grow it — keep whichever is smaller
    if (approxBytes(compressed) >= approxBytes(dataUrl)) return original;
    return { dataUrl: compressed, mediaType: 'image/jpeg' };
  } catch {
    return original;
  }
}

/** Small thumbnail for result pages — cheap to persist in localStorage. */
export async function makeThumbnail(dataUrl: string, maxDimension = 160): Promise<string> {
  try {
    const img = await loadImage(dataUrl);
    const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.7);
  } catch {
    return dataUrl;
  }
}

/** Splits a data URL into the raw base64 payload the API routes expect. */
export function dataUrlToBase64(dataUrl: string): string {
  const comma = dataUrl.indexOf(',');
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}
