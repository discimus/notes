import { appState } from '../state/AppState.js';
import type { AppView, TimelineFilters } from '../state/AppState.js';
import { editorStore } from '../state/EditorStore.js';
import type { EditorTarget } from '../state/EditorStore.js';
import { snackbar } from '../components/Snackbar.js';
import { showConfirmDialog } from '../components/Dialog.js';
import { showExampleScenarioDialog } from '../components/OnboardingDialog.js';
import { offerExampleScenarioIfNeeded } from '../app/onboarding.js';
import {
  hasCachedAttachmentPlaybackUrl,
  registerAttachmentPlaybackUrl,
  releaseAttachmentPlaybackUrl,
} from '../components/attachmentPlaybackCache.js';
import { DraftStore } from '../state/DraftStore.js';
import { pushNavigation } from '../app/navigation.js';
import { getSettings } from '../app/settings.js';
import { getAutoOpenBlankEditor } from '../app/autoOpenBlankEditor.js';
import {
  planTextImportBatch as planTextFileBatch,
  prepareTextImport as prepareTextFile,
  type PreparedTextImport,
  type PreparedTextImportBatch,
  type TextImportItem,
} from '../app/textFileImport.js';
import {
  processTextImportQueue,
  type TextImportQueueResult,
  type TextImportQueueSnapshot,
} from '../app/textImportQueue.js';
import {
  STORAGE_PERSIST_THRESHOLD_BYTES,
  isQuotaExceededError,
  requestPersistentStorage,
  storageErrorMessage,
} from '../app/storageQuota.js';
import type {
  AddNoteAttachmentCommand,
  AttachmentDTO,
  ChainDetailDTO,
  NoteContentType,
  NoteDTO,
} from '@application/dto/index.js';
import type { ISODateString } from '@shared/types/index.js';

import {
  CreateChain,
  CreateChainWithHeader,
  CreateChainWithNote,
  AppendNoteToChain,
  UpdateNoteContent,
  DeleteNote,
  UpdateChainTitle,
  AssignTagToChain,
  RemoveTagFromChain,
  AssignTagToNote,
  RemoveTagFromNote,
  GetChainDetails,
  SearchNotesPage,
  GetTimelinePage,
  ImportTextNotes,
  ImportTextFile,
  ArchiveChain,
  RestoreChain,
  DeleteChain,
  RestoreFromTrash,
  GetAllTags,
  RenameTag,
  DeleteTag,
  AddNoteAttachment,
  DeleteNoteAttachment,
  GetAttachmentBlob,
  LoadExampleScenario,
} from '@application/use-cases/index.js';

import { IdbChainRepository } from '@infrastructure/repositories/IdbChainRepository.js';
import { IdbTagRepository } from '@infrastructure/repositories/IdbTagRepository.js';
import { IdbAttachmentRepository } from '@infrastructure/repositories/IdbAttachmentRepository.js';

const chainRepo = new IdbChainRepository();
const tagRepo = new IdbTagRepository();
const attachmentRepo = new IdbAttachmentRepository();

// Use cases
const createEmptyChain = new CreateChain(chainRepo);
const createChainWithHeader = new CreateChainWithHeader(chainRepo, tagRepo);
const createChainWithNoteUseCase = new CreateChainWithNote(chainRepo);
const appendNote = new AppendNoteToChain(chainRepo);
const updateNote = new UpdateNoteContent(chainRepo, tagRepo);
const deleteNoteUseCase = new DeleteNote(chainRepo, tagRepo, attachmentRepo);
const updateTitle = new UpdateChainTitle(chainRepo);
const assignTag = new AssignTagToChain(chainRepo, tagRepo);
const removeTag = new RemoveTagFromChain(chainRepo, tagRepo);
const assignNoteTag = new AssignTagToNote(chainRepo, tagRepo);
const removeNoteTag = new RemoveTagFromNote(chainRepo, tagRepo);
const getChainDetails = new GetChainDetails(chainRepo, tagRepo, attachmentRepo);
const searchNotesPage = new SearchNotesPage(chainRepo, tagRepo);
const getTimelinePage = new GetTimelinePage(chainRepo, tagRepo);
let searchRequestId = 0;
const importTextFileUseCase = new ImportTextFile(chainRepo);
const importTextNotesUseCase = new ImportTextNotes(chainRepo);
const archiveChain = new ArchiveChain(chainRepo);
const restoreChain = new RestoreChain(chainRepo);
const deleteChain = new DeleteChain(chainRepo);
const restoreFromTrash = new RestoreFromTrash(chainRepo);
const getAllTags = new GetAllTags(tagRepo);
const renameTag = new RenameTag(tagRepo);
const deleteTag = new DeleteTag(tagRepo);
const addNoteAttachmentUseCase = new AddNoteAttachment(chainRepo, attachmentRepo);
const deleteNoteAttachmentUseCase = new DeleteNoteAttachment(attachmentRepo);
const getAttachmentBlobUseCase = new GetAttachmentBlob(attachmentRepo);
const loadExampleScenario = new LoadExampleScenario(chainRepo, tagRepo);

async function preloadAudioAttachments(detail: ChainDetailDTO): Promise<void> {
  const audios = detail.notes.flatMap((note) =>
    (note.attachments ?? []).filter((attachment) => attachment.kind === 'audio')
  );

  await Promise.all(
    audios.map(async (attachment) => {
      if (hasCachedAttachmentPlaybackUrl(attachment.id)) return;
      try {
        const blob = await getAttachmentBlobUseCase.execute(attachment.id);
        if (blob) {
          registerAttachmentPlaybackUrl(attachment.id, blob, attachment.mimeType);
        }
      } catch {
        return;
      }
    })
  );
}

export interface EditorSaveSuccess {
  ok: true;
  target: EditorTarget;
  chainTitle: string;
  note: NoteDTO;
}

export interface EditorSaveFailure {
  ok: false;
  error: string;
}

export type EditorSaveResult = EditorSaveSuccess | EditorSaveFailure;

export interface EditorAppendSuccess {
  ok: true;
  note: NoteDTO;
  chainTitle: string;
}

export interface EditorAppendDuplicate {
  ok: true;
  duplicate: true;
  fileName: string;
}

export type EditorAppendResult = EditorAppendSuccess | EditorSaveFailure;

export type TextImportNoteResult =
  | EditorAppendSuccess
  | EditorAppendDuplicate
  | EditorSaveFailure;

export type TextImportPreparationResult =
  | { ok: true; data: PreparedTextImport }
  | { ok: false; error: string };

export type TextImportBatchPreparationResult =
  | { ok: true; data: PreparedTextImportBatch }
  | { ok: false; error: string };

export interface EditorBatchAppendSuccess {
  ok: true;
  notes: NoteDTO[];
  chainTitle: string;
}

export type EditorBatchAppendResult = EditorBatchAppendSuccess | EditorSaveFailure;

export interface AttachmentMutationSuccess {
  ok: true;
  attachment: AttachmentDTO;
}

export type AttachmentMutationResult = AttachmentMutationSuccess | EditorSaveFailure;

function editorErrorMessage(error: unknown): string {
  if (isQuotaExceededError(error)) return storageErrorMessage(error);
  return error instanceof Error && error.message
    ? error.message
    : 'Não foi possível salvar o documento.';
}

function chainTitleById(chainId: string): string {
  return (
    appState.get().chainSummaries.find((chain) => chain.id === chainId)?.displayTitle ??
    'Coleção'
  );
}

/** Carrega a lista de coleções conforme a view atual */
async function loadChains(): Promise<void> {
  const state = appState.get();
  appState.set({ isLoading: true, error: null });
  try {
    let summaries;
    if (state.view === 'archived') {
      summaries = await getChainDetails.getSummaries({ archived: true });
    } else if (state.view === 'trash') {
      summaries = await getChainDetails.getSummaries({ deleted: true });
    } else {
      summaries = await getChainDetails.getSummaries({ archived: false });
    }
    appState.set({ chainSummaries: summaries, isLoading: false });
  } catch (e) {
    appState.set({ isLoading: false, error: String(e) });
  }
}

async function loadTags(): Promise<void> {
  const tags = await getAllTags.execute();
  appState.set({ allTags: tags });
}

/** Abre uma coleção e carrega seus detalhes */
async function openChain(chainId: string, push = true): Promise<void> {
  if (push) pushNavigation('chain-detail', chainId);
  appState.set({ isLoading: true, selectedChainId: chainId, view: 'chain-detail' });
  try {
    const detail = await getChainDetails.execute(chainId);
    appState.set({ currentChain: detail, isLoading: false });
  } catch (e) {
    appState.set({ isLoading: false, error: String(e) });
    snackbar.error('Não foi possível abrir a coleção.');
  }
}

async function loadEditorChainTab(
  tabId: string,
  chainId: string,
  force = false
): Promise<void> {
  const tab = editorStore.getTab(tabId);
  if (!tab || tab.kind !== 'chain') return;
  if (!force && tab.status !== 'idle' && tab.status !== 'error') return;
  if (tab.status === 'loading') return;

  editorStore.setChainTabStatus(tabId, 'loading');

  try {
    const detail = await getChainDetails.execute(chainId);
    await preloadAudioAttachments(detail);
    editorStore.setChainTabNotes(tabId, detail);
  } catch (error: unknown) {
    editorStore.setChainTabError(tabId);
    snackbar.error(
      error instanceof Error ? error.message : 'Não foi possível carregar a coleção.'
    );
  }
}

function syncEditorChainTab(chainId: string, detail: ChainDetailDTO): void {
  const tab = editorStore.findChainTab(chainId);
  if (tab) editorStore.setChainTabNotes(tab.id, detail);
}

async function refreshEditorChainTab(chainId: string): Promise<void> {
  const tab = editorStore.findChainTab(chainId);
  if (!tab) return;

  try {
    const detail = await getChainDetails.execute(chainId);
    await preloadAudioAttachments(detail);
    syncEditorChainTab(chainId, detail);
  } catch {
    editorStore.setChainTabError(tab.id);
  }
}

async function refreshAfterAttachmentChange(chainId: string): Promise<void> {
  if (appState.get().view === 'editor') {
    await refreshEditorChainTab(chainId);
  } else {
    await openChain(chainId, false);
  }
}

const TIMELINE_WINDOW_MAX = 200;
let timelineRequestId = 0;

function timelineFromDate(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function timelineToDate(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

async function loadTimelinePage(offset: number, mode: 'replace' | 'append'): Promise<void> {
  const state = appState.get();
  const requestId = ++timelineRequestId;
  const chainIds =
    state.timelineSelectedChainIds.length > 0
      ? state.timelineSelectedChainIds
      : state.chainSummaries.map((chain) => chain.id);
  const filters = state.timelineFilters;

  if (chainIds.length === 0) {
    appState.set({
      timelineEntries: [],
      timelineTotal: 0,
      timelineLoadedOffset: 0,
      timelinePageIndex: 0,
      timelineIsLoadingMore: false,
      isLoading: false,
    });
    return;
  }

  appState.set(
    mode === 'append'
      ? { timelineIsLoadingMore: true }
      : { isLoading: true, error: null, timelineIsLoadingMore: false }
  );

  try {
    const page = await getTimelinePage.execute({
      chainIds,
      ...(timelineFromDate(filters.from) ? { from: timelineFromDate(filters.from)! } : {}),
      ...(timelineToDate(filters.to) ? { to: timelineToDate(filters.to)! } : {}),
      ...(filters.query.trim() ? { text: filters.query.trim() } : {}),
      ...(filters.tagIds.length > 0 ? { tagIds: filters.tagIds } : {}),
      tagMode: filters.tagMode ?? 'any',
      ...(filters.contentTypes && filters.contentTypes.length > 0
        ? { contentTypes: filters.contentTypes }
        : {}),
      sort: filters.sort ?? 'newest',
      offset,
      limit: state.timelinePageSize,
    });

    if (requestId !== timelineRequestId) return;

    if (mode === 'append') {
      let entries = [...appState.get().timelineEntries, ...page.entries];
      let loadedOffset = appState.get().timelineLoadedOffset;

      if (entries.length > TIMELINE_WINDOW_MAX) {
        const removeCount = entries.length - TIMELINE_WINDOW_MAX;
        entries = entries.slice(removeCount);
        loadedOffset += removeCount;
      }

      appState.set({
        timelineEntries: entries,
        timelineTotal: page.total,
        timelineLoadedOffset: loadedOffset,
        timelinePageIndex: Math.floor(loadedOffset / state.timelinePageSize),
        timelineIsLoadingMore: false,
        isLoading: false,
      });
      return;
    }

    appState.set({
      timelineEntries: page.entries,
      timelineTotal: page.total,
      timelineLoadedOffset: offset,
      timelinePageIndex: Math.floor(offset / state.timelinePageSize),
      timelineIsLoadingMore: false,
      isLoading: false,
    });
  } catch (error: unknown) {
    if (requestId !== timelineRequestId) return;
    appState.set({ isLoading: false, timelineIsLoadingMore: false });
    snackbar.error(error instanceof Error ? error.message : 'Não foi possível carregar a timeline.');
  }
}

async function openNoteInEditor(
  chainId: string,
  noteId: string,
  query: string
): Promise<void> {
  try {
    const detail = await getChainDetails.execute(chainId);
    const note = detail.notes.find((item) => item.id === noteId);
    if (!note) throw new Error('Nota não encontrada.');

    const tab = editorStore.openChainTab(chainId, detail.displayTitle, {
      composerCollapsed: true,
      preview: false,
    });
    editorStore.setChainTabNotes(tab.id, detail);
    editorStore.openChainNoteEditTab(tab.id, note);

    appState.set({
      editorFocusRequest: {
        noteId,
        query,
      },
    });
    await AppController.openChainInEditor(chainId, detail);
  } catch (e: unknown) {
    appState.set({ editorFocusRequest: null });
    snackbar.error((e as Error).message);
  }
}

function focusDraftTab(tabId: string): void {
  const focus = (): void => {
    if (appState.get().view !== 'editor') return;
    if (editorStore.getActiveTab()?.id !== tabId) return;
    document.querySelector<HTMLTextAreaElement>('#draft-textarea')?.focus();
  };

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => requestAnimationFrame(focus));
  } else {
    setTimeout(focus, 0);
  }
}

export const AppController = {
  async init(): Promise<void> {
    await loadChains();
    await loadTags();
    setTimeout(() => {
      void AppController.offerExampleScenario();
    }, 200);
  },

  async offerExampleScenario(): Promise<void> {
    let primaryChainId: string | null = null;

    try {
      const loaded = await offerExampleScenarioIfNeeded({
        isLibraryEmpty: async () => {
          const [chains, tags] = await Promise.all([
            chainRepo.findAll(),
            tagRepo.findAll(),
          ]);
          return chains.length === 0 && tags.length === 0;
        },
        confirmLoadExamples: showExampleScenarioDialog,
        loadExamples: async () => {
          const result = await loadExampleScenario.execute();
          primaryChainId = result.primaryChainId;
          await Promise.all([loadChains(), loadTags()]);
        },
      });

      if (!loaded || !primaryChainId) return;

      try {
        const detail = await getChainDetails.execute(primaryChainId);
        await AppController.openChainInEditor(primaryChainId, detail);
      } catch {
        snackbar.error('Cenário carregado, mas não foi possível abrir a coleção inicial.');
        return;
      }

      snackbar.success('Cenário de exemplo carregado.');
    } catch (error: unknown) {
      snackbar.error(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar o cenário de exemplo.'
      );
    }
  },

  async createChain(title: string): Promise<void> {
    try {
      const result = await createEmptyChain.execute({ title });
      DraftStore.clear();
      appState.set({ chainFilterQuery: '' });
      snackbar.success('Coleção criada.');
      await loadChains();
      await AppController.openChainInEditor(result.id, result);
    } catch (e: unknown) {
      snackbar.error((e as Error).message);
    }
  },

  async appendNote(
    chainId: string,
    content: string,
    contentType?: NoteContentType
  ): Promise<void> {
    try {
      await appendNote.execute({ chainId, content, ...(contentType ? { contentType } : {}) });
      DraftStore.clear();
      snackbar.success('Nota adicionada.');
      await openChain(chainId);
      await loadChains();
    } catch (e: unknown) {
      snackbar.error((e as Error).message);
    }
  },

  async updateNoteContent(
    chainId: string,
    noteId: string,
    content: string,
    contentType?: NoteContentType
  ): Promise<boolean> {
    try {
      const note = await updateNote.execute({
        chainId,
        noteId,
        content,
        ...(contentType ? { contentType } : {}),
      });
      snackbar.success('Nota atualizada.');
      editorStore.updateNoteInChainTabs(chainId, note);
      if (appState.get().view === 'editor') {
        await loadChains();
      } else {
        await openChain(chainId, false);
      }
      return true;
    } catch (e: unknown) {
      snackbar.error((e as Error).message);
      return false;
    }
  },

  async deleteNote(chainId: string, noteId: string): Promise<boolean> {
    const confirmed = await showConfirmDialog({
      title: 'Excluir nota?',
      body: 'A nota será removida permanentemente da coleção, incluindo suas tags e anexos.',
      icon: 'delete',
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (!confirmed) return false;

    try {
      await deleteNoteUseCase.execute({ chainId, noteId });
      editorStore.removeNoteFromChainTabs(chainId, noteId);
      if (appState.get().timelinePreviewNoteId === noteId) {
        appState.set({ timelinePreviewNoteId: null });
      }
      snackbar.success('Nota excluída.');
      await Promise.allSettled([loadChains(), loadTags()]);

      if (appState.get().view === 'editor') {
        await refreshEditorChainTab(chainId);
      } else if (appState.get().view === 'timeline') {
        await AppController.reloadTimeline();
      } else if (appState.get().view === 'chain-detail') {
        await openChain(chainId, false);
      }
      return true;
    } catch (e: unknown) {
      snackbar.error((e as Error).message);
      return false;
    }
  },

  async addNoteAttachment(
    command: AddNoteAttachmentCommand
  ): Promise<AttachmentMutationResult> {
    try {
      const attachment = await addNoteAttachmentUseCase.execute(command);
      registerAttachmentPlaybackUrl(
        attachment.id,
        command.blob,
        command.mimeType || attachment.mimeType
      );
      await refreshAfterAttachmentChange(command.chainId);
      return { ok: true, attachment };
    } catch (error: unknown) {
      const message = editorErrorMessage(error);
      snackbar.error(message);
      return { ok: false, error: message };
    }
  },

  async addChainEndAttachment(
    command: Omit<AddNoteAttachmentCommand, 'noteId'>
  ): Promise<AttachmentMutationResult> {
    try {
      const attachment = await addNoteAttachmentUseCase.execute(command);
      registerAttachmentPlaybackUrl(
        attachment.id,
        command.blob,
        command.mimeType || attachment.mimeType
      );
      await refreshAfterAttachmentChange(command.chainId);
      return { ok: true, attachment };
    } catch (error: unknown) {
      const message = editorErrorMessage(error);
      snackbar.error(message);
      return { ok: false, error: message };
    }
  },

  async deleteNoteAttachment(
    chainId: string,
    attachmentId: string
  ): Promise<boolean> {
    try {
      await deleteNoteAttachmentUseCase.execute(attachmentId);
      releaseAttachmentPlaybackUrl(attachmentId);
      await refreshAfterAttachmentChange(chainId);
      snackbar.success('Anexo removido.');
      return true;
    } catch (error: unknown) {
      snackbar.error(editorErrorMessage(error));
      return false;
    }
  },

  async getAttachmentBlob(attachmentId: string): Promise<Blob | null> {
    try {
      return await getAttachmentBlobUseCase.execute(attachmentId);
    } catch {
      return null;
    }
  },

  async saveEditorAsNewChain(input: {
    content: string;
    contentType?: NoteContentType;
    title?: string;
    tagNames?: string[];
  }): Promise<EditorSaveResult> {
    try {
      const result = await createChainWithHeader.execute({
        content: input.content,
        ...(input.contentType ? { contentType: input.contentType } : {}),
        ...(input.title?.trim() ? { title: input.title.trim() } : {}),
        ...(input.tagNames && input.tagNames.length > 0 ? { tagNames: input.tagNames } : {}),
      });

      await Promise.allSettled([loadChains(), loadTags()]);

      const header = result.notes.find((note) => note.role === 'header') ?? result.notes[0];
      if (!header) {
        throw new Error('A nova coleção foi criada sem uma nota inicial.');
      }

      const target: EditorTarget = {
        chainId: result.id,
        noteId: header.id,
        role: header.role,
        chainTitle: result.displayTitle,
      };

      return { ok: true, target, chainTitle: result.displayTitle, note: header };
    } catch (error: unknown) {
      const message = editorErrorMessage(error);
      snackbar.error(message);
      return { ok: false, error: message };
    }
  },

  async createChainWithNote(
    title: string,
    content: string,
    contentType?: NoteContentType
  ): Promise<EditorSaveResult> {
    try {
      const result = await createChainWithNoteUseCase.execute({
        title,
        content,
        ...(contentType ? { contentType } : {}),
      });
      await Promise.allSettled([loadChains()]);

      const chainTitle = result.chain.displayTitle;
      const target: EditorTarget = {
        chainId: result.chain.id,
        noteId: result.note.id,
        role: result.note.role,
        chainTitle,
      };

      return { ok: true, target, chainTitle, note: result.note };
    } catch (error: unknown) {
      const message = editorErrorMessage(error);
      snackbar.error(message);
      return { ok: false, error: message };
    }
  },

  async saveEditorToChain(
    chainId: string,
    content: string,
    contentType?: NoteContentType
  ): Promise<EditorSaveResult> {
    try {
      const note = await appendNote.execute({
        chainId,
        content,
        ...(contentType ? { contentType } : {}),
      });
      await Promise.allSettled([loadChains()]);

      const chainTitle = chainTitleById(chainId);
      const target: EditorTarget = {
        chainId,
        noteId: note.id,
        role: note.role,
        chainTitle,
      };

      const chainTab = editorStore.findChainTab(chainId);
      if (chainTab) editorStore.appendNoteToChainTab(chainTab.id, note);

      return { ok: true, target, chainTitle, note };
    } catch (error: unknown) {
      const message = editorErrorMessage(error);
      snackbar.error(message);
      return { ok: false, error: message };
    }
  },

  async updateEditorNote(
    target: EditorTarget,
    content: string,
    contentType?: NoteContentType
  ): Promise<EditorSaveResult> {
    try {
      const note = await updateNote.execute({
        chainId: target.chainId,
        noteId: target.noteId,
        content,
        ...(contentType ? { contentType } : {}),
      });
      await Promise.allSettled([loadChains()]);

      const chainTitle = chainTitleById(target.chainId);
      editorStore.updateNoteInChainTabs(target.chainId, note);

      return {
        ok: true,
        target: { ...target, chainTitle },
        chainTitle,
        note,
      };
    } catch (error: unknown) {
      const message = editorErrorMessage(error);
      snackbar.error(message);
      return { ok: false, error: message };
    }
  },

  async appendToEditorChainTab(
    chainId: string,
    content: string,
    contentType?: NoteContentType
  ): Promise<EditorAppendResult> {
    try {
      const note = await appendNote.execute({
        chainId,
        content,
        ...(contentType ? { contentType } : {}),
      });
      await Promise.allSettled([loadChains()]);
      return { ok: true, note, chainTitle: chainTitleById(chainId) };
    } catch (error: unknown) {
      const message = editorErrorMessage(error);
      snackbar.error(message);
      return { ok: false, error: message };
    }
  },

  async prepareTextImport(file: File): Promise<TextImportPreparationResult> {
    try {
      return { ok: true, data: await prepareTextFile(file) };
    } catch (error: unknown) {
      return {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Não foi possível preparar o documento para importação.',
      };
    }
  },

  async importTextNote(
    chainId: string,
    content: string,
    sourceCreatedAt?: ISODateString,
    metadata?: { contentHash?: string; sourceFileName?: string }
  ): Promise<TextImportNoteResult> {
    try {
      if (content.length >= STORAGE_PERSIST_THRESHOLD_BYTES) {
        await requestPersistentStorage();
      }
      const result = await importTextFileUseCase.execute({
        chainId,
        content,
        ...(sourceCreatedAt ? { sourceCreatedAt } : {}),
        ...(metadata?.contentHash ? { contentHash: metadata.contentHash } : {}),
        ...(metadata?.sourceFileName
          ? { sourceFileName: metadata.sourceFileName }
          : {}),
      });

      if (result.duplicate || !result.note) {
        const fileName = metadata?.sourceFileName ?? 'Documento';
        snackbar.success(`${fileName} ignorado: conteúdo idêntico já importado.`);
        return { ok: true, duplicate: true, fileName };
      }

      const note = result.note;
      await Promise.allSettled([loadChains()]);

      const chainTab = editorStore.findChainTab(chainId);
      if (chainTab) editorStore.appendNoteToChainTab(chainTab.id, note);

      const chainTitle = chainTitleById(chainId);
      snackbar.success('Documento importado.', {
        label: 'Abrir coleção',
        onClick: () => {
          void AppController.openChainInEditor(chainId);
        },
      });
      return { ok: true, note, chainTitle };
    } catch (error: unknown) {
      return { ok: false, error: editorErrorMessage(error) };
    }
  },

  async prepareTextImportBatch(
    files: File[]
  ): Promise<TextImportBatchPreparationResult> {
    try {
      return { ok: true, data: await planTextFileBatch(files) };
    } catch (error: unknown) {
      return {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Não foi possível preparar os documentos para importação.',
      };
    }
  },

  async importTextFileQueue(
    chainId: string,
    items: TextImportItem[],
    useSourceDates: boolean,
    onProgress?: (snapshot: TextImportQueueSnapshot) => void
  ): Promise<TextImportQueueResult> {
    const importedNotes: NoteDTO[] = [];

    const result = await processTextImportQueue(items, {
      importFile: async (file) => {
        const imported = await importTextFileUseCase.execute({
          chainId,
          content: file.content,
          ...(useSourceDates && file.sourceModifiedAt
            ? { sourceCreatedAt: file.sourceModifiedAt }
            : {}),
          ...(file.contentHash ? { contentHash: file.contentHash } : {}),
          ...(file.fileName ? { sourceFileName: file.fileName } : {}),
        });
        if (imported.duplicate || !imported.note) return 'duplicate';
        importedNotes.push(imported.note);
        return 'imported';
      },
      ...(onProgress ? { onProgress } : {}),
    });

    if (importedNotes.length > 0) {
      await Promise.allSettled([loadChains()]);
      const chainTab = editorStore.findChainTab(chainId);
      if (chainTab) editorStore.appendNotesToChainTab(chainTab.id, importedNotes);
    }

    if (result.succeeded > 0) {
      snackbar.success(
        `${result.succeeded} ${
          result.succeeded === 1 ? 'documento importado' : 'documentos importados'
        }.`,
        {
          label: 'Abrir coleção',
          onClick: () => {
            void AppController.openChainInEditor(chainId);
          },
        }
      );
    }

    if (result.failed > 0) {
      snackbar.error(
        `${result.failed} ${
          result.failed === 1 ? 'documento não foi importado' : 'documentos não foram importados'
        }.`
      );
    }

    return result;
  },

  async importTextNotes(
    chainId: string,
    files: PreparedTextImport[],
    useSourceDates: boolean
  ): Promise<EditorBatchAppendResult> {
    try {
      const notes = await importTextNotesUseCase.execute({
        chainId,
        documents: files.map((file) => ({
          content: file.content,
          ...(useSourceDates && file.sourceModifiedAt
            ? { sourceCreatedAt: file.sourceModifiedAt }
            : {}),
          ...(file.contentHash ? { contentHash: file.contentHash } : {}),
          ...(file.fileName ? { sourceFileName: file.fileName } : {}),
        })),
      });
      await Promise.allSettled([loadChains()]);

      const chainTab = editorStore.findChainTab(chainId);
      if (chainTab) editorStore.appendNotesToChainTab(chainTab.id, notes);

      const chainTitle = chainTitleById(chainId);
      snackbar.success(
        `${notes.length} ${notes.length === 1 ? 'documento importado' : 'documentos importados'}.`,
        {
          label: 'Abrir coleção',
          onClick: () => {
            void AppController.openChainInEditor(chainId);
          },
        }
      );
      return { ok: true, notes, chainTitle };
    } catch (error: unknown) {
      return { ok: false, error: editorErrorMessage(error) };
    }
  },

  async openChainInEditor(
    chainId: string,
    detail?: ChainDetailDTO,
    options: { preview?: boolean } = {}
  ): Promise<string | null> {
    const wasEditor = appState.get().view === 'editor';
    const existing = editorStore.findChainTab(chainId);
    const title =
      detail?.displayTitle ??
      appState.get().chainSummaries.find((chain) => chain.id === chainId)?.displayTitle ??
      'Coleção';

    const tab = editorStore.openChainTab(chainId, title, {
      composerCollapsed: true,
      preview: options.preview === true,
    });
    appState.set({ view: 'editor', selectedChainId: null, currentChain: null });
    pushNavigation('editor', chainId);

    if (detail) {
      await preloadAudioAttachments(detail);
      editorStore.setChainTabNotes(tab.id, detail);
    } else if (existing) {
      await loadEditorChainTab(tab.id, chainId, true);
    }

    if (!wasEditor) {
      await loadChains();
    }

    if (getAutoOpenBlankEditor()) {
      editorStore.setChainComposerCollapsed(tab.id, false);
      editorStore.ensureChainNoteTab(tab.id);
    }

    return tab.id;
  },

  async openSearchResult(chainId: string, noteId: string): Promise<void> {
    await openNoteInEditor(chainId, noteId, appState.get().searchQuery);
  },

  async openTimelineResult(
    chainId: string,
    noteId: string,
    query: string
  ): Promise<void> {
    await openNoteInEditor(chainId, noteId, query);
  },

  async updateChainTitle(chainId: string, title: string | undefined): Promise<void> {
    try {
      await updateTitle.execute({ chainId, ...(title ? { title } : {}) });
      await loadChains();
      if (appState.get().view === 'editor') {
        await refreshEditorChainTab(chainId);
      } else {
        await openChain(chainId, false);
      }
    } catch (e: unknown) {
      snackbar.error((e as Error).message);
    }
  },

  async assignTag(chainId: string, tagName: string): Promise<boolean> {
    try {
      await assignTag.execute({ chainId, tagName });
      await loadTags();
      await loadChains();
      if (appState.get().view === 'editor') {
        await refreshEditorChainTab(chainId);
      } else {
        await openChain(chainId, false);
      }
      return true;
    } catch (e: unknown) {
      snackbar.error((e as Error).message);
      return false;
    }
  },

  async removeTag(chainId: string, tagId: string): Promise<void> {
    try {
      await removeTag.execute({ chainId, tagId });
      await loadChains();
      if (appState.get().view === 'editor') {
        await refreshEditorChainTab(chainId);
      } else {
        await openChain(chainId, false);
      }
    } catch (e: unknown) {
      snackbar.error((e as Error).message);
    }
  },

  async assignNoteTag(
    chainId: string,
    noteId: string,
    tagName: string
  ): Promise<boolean> {
    try {
      await assignNoteTag.execute({ chainId, noteId, tagName });
      await Promise.allSettled([loadTags(), loadChains()]);
      if (appState.get().view === 'editor') {
        await refreshEditorChainTab(chainId);
      } else {
        await openChain(chainId, false);
      }
      return true;
    } catch (e: unknown) {
      snackbar.error((e as Error).message);
      return false;
    }
  },

  async removeNoteTag(
    chainId: string,
    noteId: string,
    tagId: string
  ): Promise<void> {
    try {
      await removeNoteTag.execute({ chainId, noteId, tagId });
      await Promise.allSettled([loadTags(), loadChains()]);
      if (appState.get().view === 'editor') {
        await refreshEditorChainTab(chainId);
      } else {
        await openChain(chainId, false);
      }
    } catch (e: unknown) {
      snackbar.error((e as Error).message);
    }
  },

  async archiveChain(chainId: string): Promise<void> {
    const confirmed = await showConfirmDialog({
      title: 'Arquivar coleção?',
      body: 'A coleção será movida para o arquivo. Você pode restaurá-la a qualquer momento.',
      icon: 'archive',
      confirmLabel: 'Arquivar',
    });
    if (!confirmed) return;
    const wasEditor = appState.get().view === 'editor';
    try {
      await archiveChain.execute(chainId);
      editorStore.closeChainTabs(chainId);
      snackbar.success('Coleção arquivada.', {
        label: 'Desfazer',
        onClick: () => AppController.restoreChain(chainId),
      });
      if (wasEditor) {
        appState.set({ selectedChainId: null, currentChain: null });
        pushNavigation('editor');
      } else {
        appState.set({ selectedChainId: null, currentChain: null, view: 'chains' });
        pushNavigation('chains');
      }
      await loadChains();
    } catch (e: unknown) {
      snackbar.error((e as Error).message);
    }
  },

  async restoreChain(chainId: string): Promise<void> {
    try {
      await restoreChain.execute(chainId);
      snackbar.success('Coleção restaurada.');
      await loadChains();
    } catch (e: unknown) {
      snackbar.error((e as Error).message);
    }
  },

  async deleteChain(chainId: string): Promise<void> {
    if (getSettings().confirmBeforeTrash) {
      const confirmed = await showConfirmDialog({
        title: 'Mover para a lixeira?',
        body: 'A coleção será movida para a lixeira. Você pode restaurá-la ou excluí-la permanentemente.',
        icon: 'delete',
        confirmLabel: 'Mover para lixeira',
        destructive: true,
      });
      if (!confirmed) return;
    }
    const wasEditor = appState.get().view === 'editor';
    try {
      await deleteChain.execute(chainId, false);
      editorStore.closeChainTabs(chainId);
      snackbar.success('Coleção movida para a lixeira.', {
        label: 'Desfazer',
        onClick: () => AppController.restoreFromTrash(chainId),
      });
      if (wasEditor) {
        appState.set({ selectedChainId: null, currentChain: null });
        pushNavigation('editor');
      } else {
        appState.set({ selectedChainId: null, currentChain: null, view: 'chains' });
        pushNavigation('chains');
      }
      await loadChains();
    } catch (e: unknown) {
      snackbar.error((e as Error).message);
    }
  },

  async permanentDelete(chainId: string): Promise<void> {
    const confirmed = await showConfirmDialog({
      title: 'Excluir permanentemente?',
      body: 'Esta ação não pode ser desfeita. A coleção e todas as suas notas serão removidas definitivamente.',
      icon: 'delete_forever',
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteChain.execute(chainId, true);
      editorStore.closeChainTabs(chainId);
      snackbar.success('Coleção excluída permanentemente.');
      appState.set({ selectedChainId: null, currentChain: null });
      await loadChains();
    } catch (e: unknown) {
      snackbar.error((e as Error).message);
    }
  },

  async restoreFromTrash(chainId: string): Promise<void> {
    try {
      await restoreFromTrash.execute(chainId);
      snackbar.success('Coleção restaurada da lixeira.');
      await loadChains();
    } catch (e: unknown) {
      snackbar.error((e as Error).message);
    }
  },

  clearSearch(): void {
    searchRequestId += 1;
    appState.set({
      searchQuery: '',
      searchResults: [],
      searchSelectedNoteId: null,
      searchLoadedOffset: 0,
      searchHasMore: false,
      searchIsLoadingMore: false,
      isLoading: false,
    });
  },

  async search(query: string): Promise<void> {
    const requestId = ++searchRequestId;
    const limit = appState.get().searchPageSize;
    appState.set({
      searchQuery: query,
      view: 'search',
      isLoading: true,
      searchResults: [],
      searchSelectedNoteId: null,
      searchLoadedOffset: 0,
      searchHasMore: false,
      searchIsLoadingMore: false,
    });
    try {
      const page = await searchNotesPage.execute({ query, offset: 0, limit });
      if (requestId !== searchRequestId) return;
      appState.set({
        searchResults: page.results,
        searchLoadedOffset: page.offset + page.results.length,
        searchHasMore: page.hasMore,
        isLoading: false,
      });
    } catch (e: unknown) {
      if (requestId !== searchRequestId) return;
      appState.set({ isLoading: false, searchHasMore: false });
      snackbar.error((e as Error).message);
    }
  },

  async loadMoreSearch(): Promise<void> {
    const state = appState.get();
    if (
      state.view !== 'search' ||
      state.isLoading ||
      state.searchIsLoadingMore ||
      !state.searchHasMore ||
      !state.searchQuery.trim()
    ) {
      return;
    }

    const requestId = ++searchRequestId;
    const offset = state.searchLoadedOffset;
    appState.set({ searchIsLoadingMore: true });
    try {
      const page = await searchNotesPage.execute({
        query: state.searchQuery,
        offset,
        limit: state.searchPageSize,
      });
      if (requestId !== searchRequestId) return;
      const seen = new Set(state.searchResults.map((result) => result.noteId));
      const appended = page.results.filter(
        (result) => !seen.has(result.noteId)
      );
      appState.set({
        searchResults: [...state.searchResults, ...appended],
        searchLoadedOffset: page.offset + page.results.length,
        searchHasMore: page.hasMore,
        searchIsLoadingMore: false,
      });
    } catch (e: unknown) {
      if (requestId !== searchRequestId) return;
      appState.set({ searchIsLoadingMore: false });
      snackbar.error((e as Error).message);
    }
  },

  async reloadTimeline(): Promise<void> {
    appState.set({ timelinePageIndex: 0, timelinePreviewNoteId: null });
    await loadTimelinePage(0, 'replace');
  },

  async updateTimelineSelection(chainIds: string[]): Promise<void> {
    appState.set({
      timelineSelectedChainIds: [...new Set(chainIds)],
      timelinePageIndex: 0,
      timelinePreviewNoteId: null,
    });
    await loadTimelinePage(0, 'replace');
  },

  async updateTimelineFilters(patch: Partial<TimelineFilters>): Promise<void> {
    appState.set({
      timelineFilters: { ...appState.get().timelineFilters, ...patch },
      timelinePageIndex: 0,
      timelinePreviewNoteId: null,
    });
    await loadTimelinePage(0, 'replace');
  },

  async clearTimelineFilters(): Promise<void> {
    appState.set({
      timelineFilters: {
        query: '',
        from: '',
        to: '',
        tagIds: [],
        contentTypes: [],
        tagMode: 'any',
        sort: 'newest',
      },
      timelinePageIndex: 0,
      timelinePreviewNoteId: null,
    });
    await loadTimelinePage(0, 'replace');
  },

  async loadMoreTimeline(): Promise<void> {
    const state = appState.get();
    if (state.timelineIsLoadingMore || state.isLoading) return;
    const loaded = state.timelineLoadedOffset + state.timelineEntries.length;
    if (loaded >= state.timelineTotal) return;
    await loadTimelinePage(loaded, 'append');
  },

  async seekTimelinePage(pageIndex: number): Promise<void> {
    const state = appState.get();
    const totalPages = Math.max(1, Math.ceil(state.timelineTotal / state.timelinePageSize));
    const page = Math.min(Math.max(0, pageIndex), totalPages - 1);
    appState.set({ timelinePreviewNoteId: null });
    await loadTimelinePage(page * state.timelinePageSize, 'replace');
  },

  async renameTag(tagId: string, newName: string): Promise<void> {
    try {
      await renameTag.execute(tagId, newName);
      await loadTags();
      snackbar.success('Tag renomeada.');
    } catch (e: unknown) {
      snackbar.error((e as Error).message);
    }
  },

  async deleteTagById(tagId: string): Promise<void> {
    const confirmed = await showConfirmDialog({
      title: 'Remover tag?',
      body: 'A tag será removida de todas as coleções e notas, mas as coleções não serão excluídas.',
      icon: 'label_off',
      confirmLabel: 'Remover',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteTag.execute(tagId);
      await loadTags();
      await loadChains();
      snackbar.success('Tag removida.');
    } catch (e: unknown) {
      snackbar.error((e as Error).message);
    }
  },

  openBlankDocument(): void {
    if (appState.get().view !== 'editor') {
      void AppController.navigateTo('editor');
    }

    const tab = editorStore.createDraftTab();
    focusDraftTab(tab.id);
  },

  async navigateTo(view: AppView, chainId?: string): Promise<void> {
    if (view === 'editor' && chainId) {
      await AppController.openChainInEditor(chainId);
      return;
    }

    appState.set({
      view,
      selectedChainId: chainId ?? null,
      currentChain: null,
      chainFilterQuery: '',
    });
    pushNavigation(view, chainId);

    if (view === 'editor' || view === 'chains' || view === 'archived' || view === 'trash') {
      await loadChains();
    } else if (view === 'tags') {
      await loadTags();
    } else if (view === 'timeline') {
      await loadTags();
      if (appState.get().chainSummaries.length > 0) {
        await AppController.reloadTimeline();
      }
    } else if (view === 'chain-detail' && chainId) {
      await openChain(chainId, false);
    }
  },

  openChain,
  loadEditorChainTab,
  loadChains,
  loadTags,
};
