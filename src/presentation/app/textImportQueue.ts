import {
  MAX_TEXT_IMPORT_BYTES,
  TEXT_IMPORT_CONCURRENCY,
  formatFileSize,
  prepareTextImport,
  type PreparedTextImport,
  type TextImportItem,
} from './textFileImport.js';
import {
  STORAGE_PERSIST_THRESHOLD_BYTES,
  STORAGE_QUOTA_ERROR_MESSAGE,
  estimateStorage,
  requestPersistentStorage,
  storageErrorMessage,
  type StorageEstimateInfo,
} from './storageQuota.js';

export interface TextImportQueueSnapshot {
  items: readonly TextImportItem[];
  total: number;
  processed: number;
  pending: number;
  succeeded: number;
  failed: number;
  duplicates: number;
  storage: StorageEstimateInfo | null;
}

export interface TextImportQueueResult {
  items: TextImportItem[];
  total: number;
  succeeded: number;
  failed: number;
  duplicates: number;
  storage: StorageEstimateInfo | null;
}

export interface TextImportQueueOptions {
  concurrency?: number;
  prepareFile?: (file: File) => Promise<PreparedTextImport>;
  importFile: (file: PreparedTextImport, item: TextImportItem) => Promise<void>;
  onProgress?: (snapshot: TextImportQueueSnapshot) => void;
}

function snapshot(
  items: readonly TextImportItem[],
  storage: StorageEstimateInfo | null
): TextImportQueueSnapshot {
  let succeeded = 0;
  let failed = 0;
  let duplicates = 0;
  let pending = 0;

  for (const item of items) {
    if (item.status === 'imported') succeeded += 1;
    else if (item.status === 'failed') failed += 1;
    else if (item.status === 'duplicate') duplicates += 1;
    else pending += 1;
  }

  return {
    items,
    total: items.length,
    processed: succeeded + failed + duplicates,
    pending,
    succeeded,
    failed,
    duplicates,
    storage,
  };
}

function toResult(
  items: TextImportItem[],
  storage: StorageEstimateInfo | null
): TextImportQueueResult {
  const progress = snapshot(items, storage);
  return {
    items,
    total: progress.total,
    succeeded: progress.succeeded,
    failed: progress.failed,
    duplicates: progress.duplicates,
    storage,
  };
}

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function failPending(items: TextImportItem[], message: string): void {
  for (const item of items) {
    if (item.status === 'pending' || item.status === 'processing') {
      item.status = 'failed';
      item.error = message;
    }
  }
}

export async function processTextImportQueue(
  items: TextImportItem[],
  options: TextImportQueueOptions
): Promise<TextImportQueueResult> {
  const pendingBytes = items.reduce(
    (total, item) => (item.status === 'pending' ? total + item.byteSize : total),
    0
  );

  if (pendingBytes >= STORAGE_PERSIST_THRESHOLD_BYTES) {
    await requestPersistentStorage();
  }

  const storage = await estimateStorage();
  const notify = (): void => {
    options.onProgress?.(snapshot(items, storage));
  };

  notify();

  if (
    storage &&
    storage.quota > 0 &&
    pendingBytes > storage.usableBytes
  ) {
    failPending(items, STORAGE_QUOTA_ERROR_MESSAGE);
    notify();
    return toResult(items, storage);
  }

  const prepareFile = options.prepareFile ?? prepareTextImport;
  const concurrency = Math.max(1, options.concurrency ?? TEXT_IMPORT_CONCURRENCY);
  const queue = items.filter((item) => item.status === 'pending');

  for (let start = 0; start < queue.length; start += concurrency) {
    const batch = queue.slice(start, start + concurrency);

    for (const item of batch) {
      item.status = 'processing';
    }
    notify();

    const prepared = await Promise.all(
      batch.map(async (item) => {
        try {
          if (item.byteSize > MAX_TEXT_IMPORT_BYTES) {
            throw new Error(
              `O arquivo excede o limite de ${formatFileSize(MAX_TEXT_IMPORT_BYTES)}.`
            );
          }
          return { item, data: await prepareFile(item.file) };
        } catch (error: unknown) {
          return { item, error };
        }
      })
    );

    for (const result of prepared) {
      if ('error' in result) {
        result.item.status = 'failed';
        result.item.error = storageErrorMessage(result.error);
        notify();
        await yieldToEventLoop();
        continue;
      }

      try {
        await options.importFile(result.data, result.item);
        result.item.status = 'imported';
        delete result.item.error;
      } catch (error: unknown) {
        result.item.status = 'failed';
        result.item.error = storageErrorMessage(error);
      }
      notify();
      await yieldToEventLoop();
    }
  }

  notify();
  return toResult(items, storage);
}
