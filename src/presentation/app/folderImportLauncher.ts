import { AppController } from '../pages/AppController.js';
import { appState } from '../state/AppState.js';
import { editorStore } from '../state/EditorStore.js';
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

interface FolderImportTarget {
  id: string;
  title: string;
}

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

function activeImportTarget(): FolderImportTarget | null {
  const state = appState.get();
  const selectedChain =
    state.view === 'editor'
      ? null
      : state.chainSummaries.find(
          (summary) => summary.id === state.selectedChainId
        ) ?? null;
  if (selectedChain && !selectedChain.deletedAt) {
    return { id: selectedChain.id, title: selectedChain.displayTitle };
  }

  const activeTab = editorStore.getActiveTab();
  if (activeTab?.kind === 'chain') {
    return { id: activeTab.chainId, title: activeTab.title };
  }

  return null;
}

function showFailures(result: FolderImportResult): void {
  if (result.failedFolders > 0) {
    snackbar.error(
      `${result.failedFolders} ${
        result.failedFolders === 1
          ? 'pasta não foi importada'
          : 'pastas não foram importadas'
      }.`
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

function showCollectionSummary(result: FolderImportResult): void {
  const created = result.createdChains.length;
  const skipped = result.skippedFolders;

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

  showFailures(result);
}

function showAppendSummary(
  result: FolderImportResult,
  target: FolderImportTarget
): void {
  const openAction = {
    label: 'Abrir coleção',
    onClick: () => {
      void AppController.openChainInEditor(target.id);
    },
  };

  if (result.notesImported > 0) {
    const ignored =
      result.duplicates > 0
        ? ` ${result.duplicates} ${
            result.duplicates === 1 ? 'duplicado ignorado' : 'duplicados ignorados'
          }.`
        : '';
    snackbar.success(
      `${result.notesImported} ${
        result.notesImported === 1 ? 'nota adicionada' : 'notas adicionadas'
      } a "${target.title}".${ignored}`,
      openAction
    );
  } else if (result.skippedFolders > 0 || result.duplicates > 0) {
    snackbar.error(
      `Nenhuma nota nova foi adicionada a "${target.title}": conteúdo já importado.`
    );
  } else if (result.cancelled) {
    snackbar.error('Importação cancelada antes de adicionar notas.');
  }

  showFailures(result);
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
  const target = activeImportTarget();
  try {
    await showImportFolderDialog({
      groups: dialogGroups,
      totalFiles,
      totalBytes,
      showDateOption: hasSourceDates(files),
      ...(discoveryErrors.length > 0 ? { discoveryErrors } : {}),
      ...(target ? { appendTarget: target } : {}),
      onConfirm: async (mode, useSourceDates, onProgress, isCancelled) => {
        if (mode === 'append' && target) {
          const result = await processFolderImport({
            groups,
            useSourceDates,
            onProgress,
            isCancelled,
            importFolder: async (_folderTitle, prepared, dates) => {
              const appended = await AppController.importTextNotes(
                target.id,
                prepared,
                dates,
                { silent: true }
              );
              if (!appended.ok) {
                return { ok: false, error: appended.error };
              }
              if (appended.notes.length === 0) {
                return {
                  ok: true,
                  status: 'skipped',
                  duplicates: prepared.length,
                };
              }
              return {
                ok: true,
                status: 'created',
                chain: { id: target.id },
                notes: appended.notes,
                duplicates: Math.max(
                  0,
                  prepared.length - appended.notes.length
                ),
              };
            },
          });
          showAppendSummary(result, target);
          return result;
        }

        const result = await processFolderImport({
          groups,
          useSourceDates,
          importFolder: (title, prepared, dates) =>
            AppController.importTextFolder(title, prepared, dates),
          onProgress,
          isCancelled,
        });
        showCollectionSummary(result);
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
