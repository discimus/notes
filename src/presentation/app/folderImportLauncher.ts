import { AppController } from '../pages/AppController.js';
import { snackbar } from '../components/Snackbar.js';
import { showImportFolderDialog } from '../components/ImportFolderDialog.js';
import { MAX_TEXT_IMPORT_BYTES } from './textFileImport.js';
import { processFolderImport } from './folderImportFlow.js';
import type { FolderImportResult } from './folderImportFlow.js';
import {
  collectFolderFilesFromEntries,
  dropEntries,
  filesFromDirectoryInput,
  groupFilesByFolder,
  type FolderTextFile,
} from './textFolderImport.js';

let folderImportRunning = false;

function hasSourceDates(files: FolderTextFile[]): boolean {
  const now = Date.now();
  return files.some((entry) => {
    const timestamp = entry.file.lastModified;
    return Number.isFinite(timestamp) && timestamp > 0 && timestamp <= now;
  });
}

function isRejectedBySize(file: File): boolean {
  return file.size <= 0 || file.size > MAX_TEXT_IMPORT_BYTES;
}

function showSummary(result: FolderImportResult): void {
  const created = result.createdChains.length;
  const skipped = result.skippedFolders;
  const failed = result.failedFolders;

  if (created > 0) {
    const ignored =
      result.duplicates > 0
        ? ` ${result.duplicates} ${
            result.duplicates === 1 ? 'duplicado ignorado' : 'duplicados ignorados'
          }.`
        : '';
    const firstChain = result.createdChains[0];
    snackbar.success(
      `${created} ${created === 1 ? 'coleção criada' : 'coleções criadas'} e ${
        result.notesImported
      } ${result.notesImported === 1 ? 'nota importada' : 'notas importadas'}.${ignored}`,
      firstChain
        ? {
            label: 'Abrir coleção',
            onClick: () => {
              void AppController.openChainInEditor(firstChain.chainId);
            },
          }
        : undefined
    );
  } else if (skipped > 0) {
    snackbar.error('Nenhuma coleção foi criada: os arquivos eram inválidos ou duplicados.');
  } else if (result.cancelled) {
    snackbar.error('Importação cancelada antes de criar coleções.');
  }

  if (failed > 0) {
    snackbar.error(
      `${failed} ${failed === 1 ? 'pasta não foi importada' : 'pastas não foram importadas'}.`
    );
  }

  if (result.failedFiles > 0) {
    snackbar.error(
      `${result.failedFiles} ${
        result.failedFiles === 1
          ? 'arquivo foi rejeitado'
          : 'arquivos foram rejeitados'
      }.`
    );
  }
}

export async function startFolderImport(
  files: FolderTextFile[],
  discoveryErrors: string[] = []
): Promise<void> {
  if (folderImportRunning) return;

  if (files.length === 0) {
    snackbar.error('Nenhum arquivo de texto foi encontrado nas pastas.');
    return;
  }

  const groups = groupFilesByFolder(files);
  if (groups.length === 0) {
    snackbar.error('Nenhuma pasta com arquivos de texto foi encontrada.');
    return;
  }

  const totalFiles = files.length;
  const totalBytes = files.reduce((total, entry) => total + entry.file.size, 0);
  const dialogGroups = groups.map((group) => {
    const rejectedCount = group.files.filter((entry) =>
      isRejectedBySize(entry.file)
    ).length;
    return {
      title: group.title,
      fileCount: group.files.length - rejectedCount,
      totalBytes: group.files.reduce(
        (total, entry) => total + entry.file.size,
        0
      ),
      rejectedCount,
    };
  });

  folderImportRunning = true;
  try {
    await showImportFolderDialog({
      groups: dialogGroups,
      totalFiles,
      totalBytes,
      showDateOption: hasSourceDates(files),
      ...(discoveryErrors.length > 0 ? { discoveryErrors } : {}),
      onConfirm: async (useSourceDates, onProgress, isCancelled) => {
        const result = await processFolderImport({
          groups,
          useSourceDates,
          importFolder: (title, prepared, dates) =>
            AppController.importTextFolder(title, prepared, dates),
          onProgress,
          isCancelled,
        });
        showSummary(result);
        return result;
      },
    });
  } finally {
    folderImportRunning = false;
  }
}

export async function startFolderImportFromDataTransfer(
  dataTransfer: DataTransfer
): Promise<void> {
  const entries = dropEntries(dataTransfer);
  if (!entries.some((entry) => entry.isDirectory)) return;

  const { files, errors } = await collectFolderFilesFromEntries(entries);
  await startFolderImport(files, errors);
}

export function startFolderImportFromFiles(files: File[]): Promise<void> {
  return startFolderImport(filesFromDirectoryInput(files));
}
