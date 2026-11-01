const urls = new Map<string, string>();

function typedBlob(blob: Blob, mimeType?: string): Blob {
  if ((!blob.type || blob.type === 'application/octet-stream') && mimeType) {
    return new Blob([blob], { type: mimeType });
  }
  return blob;
}

export function getCachedAttachmentPlaybackUrl(attachmentId: string): string | null {
  return urls.get(attachmentId) ?? null;
}

export function hasCachedAttachmentPlaybackUrl(attachmentId: string): boolean {
  return urls.has(attachmentId);
}

export function registerAttachmentPlaybackUrl(
  attachmentId: string,
  blob: Blob,
  mimeType?: string
): string | null {
  const cached = urls.get(attachmentId);
  if (cached) return cached;
  if (typeof URL.createObjectURL !== 'function') return null;

  const url = URL.createObjectURL(typedBlob(blob, mimeType));
  urls.set(attachmentId, url);
  return url;
}

export function releaseAttachmentPlaybackUrl(attachmentId: string): void {
  const url = urls.get(attachmentId);
  if (!url) return;
  if (typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(url);
  urls.delete(attachmentId);
}

export function releaseAllAttachmentPlaybackUrls(): void {
  for (const url of urls.values()) {
    if (typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(url);
  }
  urls.clear();
}
