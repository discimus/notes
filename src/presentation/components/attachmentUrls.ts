import { AppController } from '../pages/AppController.js';
import {
  getCachedAttachmentPlaybackUrl,
  registerAttachmentPlaybackUrl,
  releaseAllAttachmentPlaybackUrls,
  releaseAttachmentPlaybackUrl,
} from './attachmentPlaybackCache.js';

const pending = new Map<
  string,
  { generation: number; promise: Promise<string | null> }
>();
let generation = 0;

export async function getAttachmentUrl(
  attachmentId: string,
  mimeType?: string
): Promise<string | null> {
  const cached = getCachedAttachmentPlaybackUrl(attachmentId);
  if (cached) return cached;

  const inFlight = pending.get(attachmentId);
  if (inFlight && inFlight.generation === generation) return inFlight.promise;

  if (typeof URL.createObjectURL !== 'function') return null;

  const requestGeneration = generation;
  const promise = AppController.getAttachmentBlob(attachmentId)
    .then((blob) => {
      if (!blob) return null;
      if (requestGeneration !== generation) return null;
      return registerAttachmentPlaybackUrl(attachmentId, blob, mimeType);
    })
    .catch(() => null)
    .finally(() => {
      const entry = pending.get(attachmentId);
      if (entry?.promise === promise) pending.delete(attachmentId);
    });

  pending.set(attachmentId, { generation: requestGeneration, promise });
  return promise;
}

export function releaseAttachmentUrl(attachmentId: string): void {
  releaseAttachmentPlaybackUrl(attachmentId);
}

export function releaseAllAttachmentUrls(): void {
  generation += 1;
  pending.clear();
  releaseAllAttachmentPlaybackUrls();
}
