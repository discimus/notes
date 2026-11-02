import type { ISODateString } from '@shared/types/index.js';
import { ValidationError } from '@shared/types/index.js';

export const MAX_TEXT_IMPORT_BYTES = 50 * 1024 * 1024;
export const TEXT_IMPORT_PREVIEW_CHARS = 12_000;
export const TEXT_IMPORT_HEAD_LINES = 5;
export const TEXT_IMPORT_CONCURRENCY = 5;

export interface PreparedTextImport {
  fileName: string;
  byteSize: number;
  sourceModifiedAt?: ISODateString | undefined;
  content: string;
  preview: string;
  head?: string | undefined;
  hasMoreLines?: boolean | undefined;
  characterCount: number;
  truncated: boolean;
}

export interface RejectedTextImport {
  fileName: string;
  byteSize: number;
  error: string;
}

export type TextImportItemStatus =
  | 'pending'
  | 'processing'
  | 'imported'
  | 'failed'
  | 'duplicate';

export interface TextImportItem {
  index: number;
  file: File;
  fileName: string;
  byteSize: number;
  status: TextImportItemStatus;
  error?: string | undefined;
}

export interface PreparedTextImportBatch {
  valid: PreparedTextImport[];
  rejected: RejectedTextImport[];
  totalBytes: number;
  items?: TextImportItem[] | undefined;
}

function sourceModifiedAt(file: File): ISODateString | undefined {
  const timestamp = file.lastModified;
  if (!Number.isFinite(timestamp) || timestamp <= 0 || timestamp > Date.now()) {
    return undefined;
  }
  return new Date(timestamp).toISOString();
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toLocaleString('pt-BR', {
      maximumFractionDigits: 1,
    })} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toLocaleString('pt-BR', {
      maximumFractionDigits: 1,
    })} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toLocaleString('pt-BR', {
    maximumFractionDigits: 1,
  })} GB`;
}

export async function prepareTextImport(file: File): Promise<PreparedTextImport> {
  if (file.size <= 0) {
    throw new ValidationError('O arquivo está vazio.');
  }
  if (file.size > MAX_TEXT_IMPORT_BYTES) {
    throw new ValidationError(
      `O arquivo excede o limite de ${formatFileSize(MAX_TEXT_IMPORT_BYTES)}.`
    );
  }

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  if (bytes.includes(0)) {
    throw new ValidationError('O arquivo parece ser binário. Envie um documento de texto.');
  }

  let content: string;
  try {
    content = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    throw new ValidationError('Não foi possível ler o arquivo como texto UTF-8.');
  }

  if (!content.trim()) {
    throw new ValidationError('O documento não contém texto.');
  }

  const characters = Array.from(content);
  const truncated = characters.length > TEXT_IMPORT_PREVIEW_CHARS;
  const modifiedAt = sourceModifiedAt(file);
  const lines = content.split(/\r?\n/);

  return {
    fileName: file.name || 'documento.txt',
    byteSize: file.size,
    ...(modifiedAt ? { sourceModifiedAt: modifiedAt } : {}),
    content,
    preview: truncated
      ? characters.slice(0, TEXT_IMPORT_PREVIEW_CHARS).join('')
      : content,
    head: lines.slice(0, TEXT_IMPORT_HEAD_LINES).join('\n'),
    hasMoreLines: lines.length > TEXT_IMPORT_HEAD_LINES,
    characterCount: characters.length,
    truncated,
  };
}

function fileSignature(file: File): string {
  return `${file.name.toLowerCase()}|${file.size}|${file.lastModified}`;
}

export async function planTextImportBatch(
  files: File[]
): Promise<PreparedTextImportBatch> {
  if (files.length === 0) {
    throw new ValidationError('Selecione pelo menos um documento.');
  }

  const seen = new Map<string, string>();
  const items: TextImportItem[] = [];
  const rejected: RejectedTextImport[] = [];
  let totalBytes = 0;

  files.forEach((file, index) => {
    const fileName = file.name || 'documento.txt';
    totalBytes += file.size;

    let status: TextImportItemStatus = 'pending';
    let error: string | undefined;

    if (file.size <= 0) {
      status = 'failed';
      error = 'O arquivo está vazio.';
    } else if (file.size > MAX_TEXT_IMPORT_BYTES) {
      status = 'failed';
      error = `O arquivo excede o limite de ${formatFileSize(MAX_TEXT_IMPORT_BYTES)}.`;
    } else {
      const signature = fileSignature(file);
      const original = seen.get(signature);
      if (original) {
        status = 'duplicate';
        error = `Arquivo duplicado de "${original}".`;
      } else {
        seen.set(signature, fileName);
      }
    }

    const item: TextImportItem = {
      index,
      file,
      fileName,
      byteSize: file.size,
      status,
      ...(error ? { error } : {}),
    };
    items.push(item);

    if (status !== 'pending') {
      rejected.push({
        fileName,
        byteSize: file.size,
        error: error ?? 'Não foi possível importar este documento.',
      });
    }
  });

  return { valid: [], rejected, totalBytes, items };
}

export async function prepareTextImportBatch(
  files: File[]
): Promise<PreparedTextImportBatch> {
  if (files.length === 0) {
    throw new ValidationError('Selecione pelo menos um documento.');
  }

  const totalBytes = files.reduce((total, file) => total + file.size, 0);
  const valid: PreparedTextImport[] = [];
  const rejected: RejectedTextImport[] = [];

  for (let start = 0; start < files.length; start += TEXT_IMPORT_CONCURRENCY) {
    const batch = files.slice(start, start + TEXT_IMPORT_CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (file) => {
        try {
          return { ok: true as const, data: await prepareTextImport(file) };
        } catch (error: unknown) {
          return {
            ok: false as const,
            rejected: {
              fileName: file.name || 'documento.txt',
              byteSize: file.size,
              error:
                error instanceof Error
                  ? error.message
                  : 'Não foi possível ler este documento.',
            },
          };
        }
      })
    );

    for (const result of results) {
      if (result.ok) valid.push(result.data);
      else rejected.push(result.rejected);
    }
  }

  return { valid, rejected, totalBytes };
}
