export const IMAGE_ATTACHMENT_MAX_BYTES = 3 * 1024 * 1024;
export const AUDIO_ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;

export const IMAGE_ATTACHMENT_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/avif',
] as const;

export const AUDIO_ATTACHMENT_MIME_TYPES = [
  'audio/webm',
  'audio/mp4',
  'audio/ogg',
  'audio/wav',
  'audio/x-wav',
  'audio/mpeg',
  'audio/aac',
] as const;

export function baseMimeType(mimeType: string): string {
  return mimeType.split(';')[0]?.trim().toLowerCase() ?? '';
}
