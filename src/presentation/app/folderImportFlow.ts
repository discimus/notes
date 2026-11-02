import {
  prepareTextImportBatch,
  type PreparedTextImport,
  type PreparedTextImportBatch,
} from './textFileImport.js';
import type { FolderImportGroup } from './textFolderImport.js';

export interface FolderImportProgress {
  foldersTotal: number;
  foldersProcessed: number;
  currentFolder: string | null;
  filesTotal: number;
  filesProcessed: number;
  notesImported: number;
  duplicates: number;
  failedFiles: number;
  failedFolders: number;
  skippedFolders: number;
}

export interface FolderImportCreatedChain {
  title: string;
  chainId: string;
  notesImported: number;
}

export interface FolderImportFailure {
  folder: string;
  message: string;
}

export interface FolderImportResult extends FolderImportProgress {
  createdChains: FolderImportCreatedChain[];
  failures: FolderImportFailure[];
  cancelled: boolean;
}

type FolderImportOutcome =
  | {
      ok: true;
      status: 'created';
      chain: { id: string };
      notes: unknown[];
      duplicates: number;
    }
  | { ok: true; status: 'skipped'; duplicates: number }
  | { ok: false; error: string };

export interface FolderImportOptions {
  groups: FolderImportGroup[];
  useSourceDates: boolean;
  importFolder: (
    title: string,
    files: PreparedTextImport[],
    useSourceDates: boolean
  ) => Promise<FolderImportOutcome>;
  prepareFiles?: (files: File[]) => Promise<PreparedTextImportBatch>;
  onProgress?: (progress: FolderImportProgress) => void;
  isCancelled?: () => boolean;
}

export async function processFolderImport(
  options: FolderImportOptions
): Promise<FolderImportResult> {
  const prepareFiles = options.prepareFiles ?? prepareTextImportBatch;
  const progress: FolderImportProgress = {
    foldersTotal: options.groups.length,
    foldersProcessed: 0,
    currentFolder: null,
    filesTotal: options.groups.reduce(
      (total, group) => total + group.files.length,
      0
    ),
    filesProcessed: 0,
    notesImported: 0,
    duplicates: 0,
    failedFiles: 0,
    failedFolders: 0,
    skippedFolders: 0,
  };
  const createdChains: FolderImportCreatedChain[] = [];
  const failures: FolderImportFailure[] = [];
  let cancelled = false;

  const emit = (): void => {
    options.onProgress?.({ ...progress });
  };

  emit();

  for (const group of options.groups) {
    if (options.isCancelled?.()) {
      cancelled = true;
      break;
    }

    progress.currentFolder = group.title;
    emit();

    let prepared: PreparedTextImportBatch;
    try {
      prepared = await prepareFiles(group.files.map((entry) => entry.file));
    } catch (error: unknown) {
      progress.failedFolders += 1;
      progress.foldersProcessed += 1;
      progress.filesProcessed += group.files.length;
      failures.push({
        folder: group.title,
        message:
          error instanceof Error
            ? error.message
            : 'Não foi possível preparar os arquivos da pasta.',
      });
      emit();
      continue;
    }

    if (prepared.rejected.length > 0) {
      progress.failedFiles += prepared.rejected.length;
      for (const rejected of prepared.rejected) {
        failures.push({
          folder: group.title,
          message: `${rejected.fileName}: ${rejected.error}`,
        });
      }
    }

    if (prepared.valid.length === 0) {
      progress.foldersProcessed += 1;
      progress.filesProcessed += group.files.length;
      progress.skippedFolders += 1;
      emit();
      continue;
    }

    if (options.isCancelled?.()) {
      cancelled = true;
      progress.foldersProcessed += 1;
      progress.filesProcessed += group.files.length;
      progress.skippedFolders += 1;
      emit();
      break;
    }

    try {
      const result = await options.importFolder(
        group.title,
        prepared.valid,
        options.useSourceDates
      );

      if (!result.ok) {
        progress.failedFolders += 1;
        failures.push({ folder: group.title, message: result.error });
      } else if (result.status === 'created') {
        progress.notesImported += result.notes.length;
        progress.duplicates += result.duplicates;
        createdChains.push({
          title: group.title,
          chainId: result.chain.id,
          notesImported: result.notes.length,
        });
      } else {
        progress.duplicates += result.duplicates;
        progress.skippedFolders += 1;
      }
    } catch (error: unknown) {
      progress.failedFolders += 1;
      failures.push({
        folder: group.title,
        message:
          error instanceof Error
            ? error.message
            : 'Não foi possível importar a pasta.',
      });
    }

    progress.foldersProcessed += 1;
    progress.filesProcessed += group.files.length;
    emit();
  }

  progress.currentFolder = null;
  emit();

  return {
    ...progress,
    createdChains,
    failures,
    cancelled,
  };
}
