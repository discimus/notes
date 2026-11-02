export const STORAGE_SAFETY_RATIO = 0.8;
export const STORAGE_PERSIST_THRESHOLD_BYTES = 20 * 1024 * 1024;
export const STORAGE_QUOTA_ERROR_MESSAGE =
  'Espaço de armazenamento insuficiente para importar os documentos.';

export interface StorageEstimateInfo {
  usage: number;
  quota: number;
  availableBytes: number;
  usableBytes: number;
  persisted: boolean;
}

function isDomQuotaExceeded(error: DOMException): boolean {
  return (
    error.name === 'QuotaExceededError' ||
    error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    error.code === 22 ||
    error.code === 1014
  );
}

export function isQuotaExceededError(error: unknown): boolean {
  if (typeof DOMException !== 'undefined' && error instanceof DOMException) {
    return isDomQuotaExceeded(error);
  }
  if (typeof error !== 'object' || error === null) return false;

  const value = error as { name?: unknown; code?: unknown };
  return (
    value.name === 'QuotaExceededError' ||
    value.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    value.code === 22 ||
    value.code === 1014
  );
}

export function storageErrorMessage(error: unknown): string {
  if (isQuotaExceededError(error)) return STORAGE_QUOTA_ERROR_MESSAGE;
  return error instanceof Error && error.message
    ? error.message
    : 'Não foi possível importar este documento.';
}

export async function estimateStorage(): Promise<StorageEstimateInfo | null> {
  const storage = navigator.storage;
  if (!storage || typeof storage.estimate !== 'function') return null;

  try {
    const estimate = await storage.estimate();
    const usage = estimate.usage ?? 0;
    const quota = estimate.quota ?? 0;
    const availableBytes = Math.max(0, quota - usage);
    let persisted = false;
    if (typeof storage.persisted === 'function') {
      persisted = await storage.persisted();
    }
    return {
      usage,
      quota,
      availableBytes,
      usableBytes: Math.floor(availableBytes * STORAGE_SAFETY_RATIO),
      persisted,
    };
  } catch {
    return null;
  }
}

export async function requestPersistentStorage(): Promise<boolean> {
  const storage = navigator.storage;
  if (!storage) return false;

  try {
    if (typeof storage.persisted === 'function' && (await storage.persisted())) {
      return true;
    }
    if (typeof storage.persist !== 'function') return false;
    return await storage.persist();
  } catch {
    return false;
  }
}
