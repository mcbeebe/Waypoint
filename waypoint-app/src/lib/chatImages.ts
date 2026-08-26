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

async function readAsBase64(uri: string): Promise<{ data: string; mediaType: string }> {
  const res = await fetch(uri);
  const blob = await res.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read the image'));
    reader.readAsDataURL(blob);
  });
  const comma = dataUrl.indexOf(',');
  const header = dataUrl.slice(0, comma); // e.g. data:image/jpeg;base64
  const semi = header.indexOf(';');
  return {
    data: dataUrl.slice(comma + 1),
    mediaType: header.slice(5, semi === -1 ? comma : semi),
  };
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
    type: ALLOWED_TYPES,
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
      const { data, mediaType } = await readAsBase64(asset.uri);
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
