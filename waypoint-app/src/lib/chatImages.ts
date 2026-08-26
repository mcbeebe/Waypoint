/**
 * Chat image attachments (owner feedback, Aug 26): parents photograph
 * documents — IEP pages, NOAs, denial letters — and ask about them.
 * Picks multiple images via the document picker (works on web and
 * native without extra dependencies), converts to bare base64 for the
 * Claude vision content blocks, and enforces honest limits client-side
 * (the ai-proxy re-validates server-side; the client is never trusted).
 */
import * as DocumentPicker from 'expo-document-picker';

export interface ChatImage {
  /** Claude-accepted media type. */
  media_type: string;
  /** Bare base64, no data: prefix (the API wants it bare). */
  data: string;
  name: string;
}

export const MAX_CHAT_IMAGES = 4;
/** ~3.7 MB binary per image — under the API's 5 MB/image limit with room. */
const MAX_BASE64_CHARS = 5_000_000;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
/**
 * Phone photos are commonly HEIC — the picker accepts them and the canvas
 * pipeline converts to JPEG (Safari decodes HEIC natively). Without the
 * canvas fallback path they are skipped honestly.
 */
const PICKER_TYPES = [...ALLOWED_TYPES, 'image/heic', 'image/heif'];
/**
 * Claude's vision pipeline downscales anything larger than ~1568 px on the
 * long edge anyway — resizing client-side loses nothing the model would
 * see, and turns a 6 MB iPhone photo into a few hundred KB.
 */
const TARGET_MAX_DIM = 1568;

function parseDataUrl(dataUrl: string): { data: string; mediaType: string } {
  const comma = dataUrl.indexOf(',');
  const header = dataUrl.slice(0, comma); // e.g. data:image/jpeg;base64
  const semi = header.indexOf(';');
  return {
    data: dataUrl.slice(comma + 1),
    mediaType: header.slice(5, semi === -1 ? comma : semi),
  };
}

/**
 * Web path: decode (HEIC included on Safari), downscale to the model's
 * effective resolution, and re-encode as JPEG. Returns null where canvas
 * isn't available (native) or decode fails — callers fall back to raw.
 */
async function downscaleViaCanvas(
  blob: Blob
): Promise<{ data: string; mediaType: string } | null> {
  try {
    if (typeof document === 'undefined' || typeof createImageBitmap === 'undefined') return null;
    const bmp = await createImageBitmap(blob);
    const scale = Math.min(1, TARGET_MAX_DIM / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(bmp, 0, 0, w, h);
    const parsed = parseDataUrl(canvas.toDataURL('image/jpeg', 0.85));
    return parsed.data.length > 0 ? { data: parsed.data, mediaType: 'image/jpeg' } : null;
  } catch {
    return null;
  }
}

async function readAsBase64(blob: Blob): Promise<{ data: string; mediaType: string }> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read the image'));
    reader.readAsDataURL(blob);
  });
  return parseDataUrl(dataUrl);
}

/**
 * Open the picker and return usable images. `skipped` counts files that
 * were dropped (over the count cap, too large, or an unsupported type)
 * so the caller can tell the parent honestly instead of failing silently.
 */
export async function pickChatImages(
  existingCount: number
): Promise<{ images: ChatImage[]; skipped: number }> {
  const result = await DocumentPicker.getDocumentAsync({
    type: PICKER_TYPES,
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return { images: [], skipped: 0 };

  const images: ChatImage[] = [];
  let skipped = 0;
  for (const asset of result.assets ?? []) {
    if (existingCount + images.length >= MAX_CHAT_IMAGES) {
      skipped++;
      continue;
    }
    try {
      const res = await fetch(asset.uri);
      const blob = await res.blob();

      // Preferred: downscale + normalize to JPEG (handles big photos and HEIC).
      const scaled = await downscaleViaCanvas(blob);
      if (scaled && scaled.data.length <= MAX_BASE64_CHARS) {
        images.push({ media_type: scaled.mediaType, data: scaled.data, name: asset.name ?? 'photo' });
        continue;
      }

      // Fallback (native / decode failure): raw bytes, allowlisted + capped.
      const { data, mediaType } = await readAsBase64(blob);
      const mt = ALLOWED_TYPES.includes(mediaType)
        ? mediaType
        : asset.mimeType && ALLOWED_TYPES.includes(asset.mimeType)
          ? asset.mimeType
          : null;
      if (!mt || data.length === 0 || data.length > MAX_BASE64_CHARS) {
        skipped++;
        continue;
      }
      images.push({ media_type: mt, data, name: asset.name ?? 'photo' });
    } catch {
      skipped++;
    }
  }
  return { images, skipped };
}

/** Displayable data URI for thumbnails. */
export function thumbUri(img: ChatImage): string {
  return `data:${img.media_type};base64,${img.data}`;
}
