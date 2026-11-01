import type { ISODateString } from '@shared/types/index.js';

export function normalizeImportedDate(value?: string): ISODateString | undefined {
  if (!value) return undefined;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0 || timestamp > Date.now()) {
    return undefined;
  }
  return new Date(timestamp).toISOString();
}
