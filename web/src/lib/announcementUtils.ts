type AnnouncementSegment =
  | Readonly<{ type: 'text'; content: string }>
  | Readonly<{ type: 'image'; content: string }>;

export const ANNOUNCEMENT_MAX_TITLE_LENGTH = 200;
export const ANNOUNCEMENT_MAX_BODY_BYTES = 65536;
export const ANNOUNCEMENT_MAX_IMAGE_BYTES = 1048576;
export const ANNOUNCEMENT_DISPLAY_DURATION_MS = 8000;

export function parseAnnouncementBody(body: string): readonly AnnouncementSegment[] {
  const segments: AnnouncementSegment[] = [];
  const imageRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = imageRegex.exec(body)) !== null) {
    if (match.index > lastIndex) {
      const text = body.slice(lastIndex, match.index).trim();
      if (text) segments.push({ type: 'text', content: text });
    }
    segments.push({ type: 'image', content: match[1] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < body.length) {
    const text = body.slice(lastIndex).trim();
    if (text) segments.push({ type: 'text', content: text });
  }

  return segments;
}

export function findEmbeddedDataImages(body: string): readonly string[] {
  const images: string[] = [];
  const regex = /<img[^>]+src="(data:image\/[^"]+)"[^>]*>/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(body)) !== null) {
    images.push(match[1]);
  }

  return images;
}

export function replaceEmbeddedDataImages(body: string, replacements: Record<string, string>): string {
  let result = body;
  for (const [dataUrl, uploadedUrl] of Object.entries(replacements)) {
    result = result.replace(dataUrl, uploadedUrl);
  }
  return result;
}

export function utf8ByteLength(str: string): number {
  return new TextEncoder().encode(str).length;
}

export function toBeijingDateTimeValue(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  const offset = 8 * 60;
  const localDate = new Date(date.getTime() + offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

export function beijingDateTimeToISOString(dateTimeValue: string): string {
  if (!dateTimeValue) return '';
  const offset = 8 * 60;
  const date = new Date(dateTimeValue);
  return new Date(date.getTime() - offset * 60 * 1000).toISOString();
}

export function beijingDateTimeToTimestamp(dateTimeValue: string): number {
  if (!dateTimeValue) return 0;
  const offset = 8 * 60;
  const date = new Date(dateTimeValue);
  return Math.floor((date.getTime() - offset * 60 * 1000) / 1000);
}
