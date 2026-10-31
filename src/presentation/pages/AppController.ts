import { appState } from '../state/AppState.js';
import type { AppView } from '../state/AppState.js';
import { editorStore } from '../state/EditorStore.js';
import type { EditorTarget } from '../state/EditorStore.js';
import { snackbar } from '../components/Snackbar.js';
import { showConfirmDialog } from '../components/Dialog.js';
import { DraftStore } from '../state/DraftStore.js';
import { pushNavigation } from '../app/navigation.js';
import { getSettings } from '../app/settings.js';
import type { ChainDetailDTO, NoteDTO } from '@application/dto/index.js';

import {
  CreateChainWithHeader,
  AppendNoteToChain,
  UpdateNoteContent,
  UpdateChainTitle,
  AssignTagToChain,
  RemoveTagFromChain,
  GetChainDetails,
  SearchNotes,
  GetChronologicalTimeline,
  ArchiveChain,
  RestoreChain,
  DeleteChain,
  RestoreFromTrash,
  ToggleFavorite,
  GetAllTags,
  RenameTag,
  DeleteTag,
} from '@application/use-cases/index.js';

import { IdbChainRepository } from '@infrastructure/repositories/IdbChainRepository.js';
import { IdbTagRepository } from '@infrastructure/repositories/IdbTagRepository.js';

const chainRepo = new IdbChainRepository();
const tagRepo = new IdbTagRepository();

// Use cases
const createChain = new CreateChainWithHeader(chainRepo, tagRepo);
const appendNote = new AppendNoteToChain(chainRepo);
const updateNote = new UpdateNoteContent(chainRepo);
const updateTitle = new UpdateChainTitle(chainRepo);
const assignTag = new AssignTagToChain(chainRepo, tagRepo);
const removeTag = new RemoveTagFromChain(chainRepo, tagRepo);
const getChainDetails = new GetChainDetails(chainRepo, tagRepo);
const searchNotes = new SearchNotes(chainRepo, tagRepo);
const getTimeline = new GetChronologicalTimeline(chainRepo);
const archiveChain = new ArchiveChain(chainRepo);
const restoreChain = new RestoreChain(chainRepo);
const deleteChain = new DeleteChain(chainRepo);
const restoreFromTrash = new RestoreFromTrash(chainRepo);
const toggleFav = new ToggleFavorite(chainRepo);
const getAllTags = new GetAllTags(tagRepo);
const renameTag = new RenameTag(tagRepo);
const deleteTag = new DeleteTag(tagRepo);

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

export type EditorAppendResult = EditorAppendSuccess | EditorSaveFailure;

function editorErrorMessage(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : 'Não foi possível salvar o documento.';
}

function chainTitleById(chainId: string): string {
  return (
    appState.get().chainSummaries.find((chain) => chain.id === chainId)?.displayTitle ??
    'Cadeia'
  );
}

/** Carrega a lista de cadeias conforme a view atual */
async function loadChains(): Promise<void> {
  const state = appState.get();
  appState.set({ isLoading: true, error: null });
  try {
    let summaries;
    if (state.view === 'favorites') {
      summaries = await getChainDetails.getSummaries({ favorite: true });
    } else if (state.view === 'archived') {
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

/** Abre uma cadeia e carrega seus detalhes */
async function openChain(chainId: string, push = true): Promise<void> {
  if (push) pushNavigation('chain-detail', chainId);
  appState.set({ isLoading: true, selectedChainId: chainId, view: 'chain-detail' });
  try {
    const detail = await getChainDetails.execute(chainId);
    appState.set({ currentChain: detail, isLoading: false });
  } catch (e) {
    appState.set({ isLoading: false, error: String(e) });
    snackbar.error('Não foi possível abrir a cadeia.');
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
    editorStore.setChainTabNotes(tabId, detail);
  } catch (error: unknown) {
    editorStore.setChainTabError(tabId);
    snackbar.error(
      error instanceof Error ? error.message : 'Não foi possível carregar a cadeia.'
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
    syncEditorChainTab(chainId, detail);
  } catch {
    editorStore.setChainTabError(tab.id);
  }
}

export const AppController = {
  async init(): Promise<void> {
    await loadChains();
    await loadTags();
  },

  async createChain(content: string, title?: string, tagNames?: string[]): Promise<void> {
    try {
      const result = await createChain.execute({
        content,
        ...(title ? { title } : {}),
        ...(tagNames && tagNames.length > 0 ? { tagNames } : {}),
      });
      DraftStore.clear();
      appState.set({ chainFilterQuery: '' });
      snackbar.success('Cadeia criada.');
      await loadChains();
      await loadTags();
      await AppController.openChainInEditor(result.id, result);
    } catch (e: unknown) {
      snackbar.error((e as Error).message);
    }
  },

  async appendNote(chainId: string, content: string): Promise<void> {
    try {
      await appendNote.execute({ chainId, content });
      DraftStore.clear();
      snackbar.success('Nota adicionada.');
      await openChain(chainId);
      await loadChains();
    } catch (e: unknown) {
      snackbar.error((e as Error).message);
    }
  },

  async updateNoteContent(chainId: string, noteId: string, content: string): Promise<void> {
    try {
      const note = await updateNote.execute({ chainId, noteId, content });
      snackbar.success('Nota atualizada.');
      editorStore.updateNoteInChainTabs(chainId, note);
      if (appState.get().view === 'editor') {
        await loadChains();
      } else {
        await openChain(chainId, false);
      }
    } catch (e: unknown) {
      snackbar.error((e as Error).message);
    }
  },

  async saveEditorAsNewChain(input: {
    content: string;
    title?: string;
    tagNames?: string[];
  }): Promise<EditorSaveResult> {
    try {
      const result = await createChain.execute({
        content: input.content,
        ...(input.title?.trim() ? { title: input.title.trim() } : {}),
        ...(input.tagNames && input.tagNames.length > 0 ? { tagNames: input.tagNames } : {}),
      });

      await Promise.allSettled([loadChains(), loadTags()]);

      const header = result.notes.find((note) => note.role === 'header') ?? result.notes[0];
      if (!header) {
        throw new Error('A nova cadeia foi criada sem uma nota inicial.');
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

  async saveEditorToChain(chainId: string, content: string): Promise<EditorSaveResult> {
    try {
      const note = await appendNote.execute({ chainId, content });
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

  async updateEditorNote(target: EditorTarget, content: string): Promise<EditorSaveResult> {
    try {
      const note = await updateNote.execute({
        chainId: target.chainId,
        noteId: target.noteId,
        content,
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

  async appendToEditorChainTab(chainId: string, content: string): Promise<EditorAppendResult> {
    try {
      const note = await appendNote.execute({ chainId, content });
      await Promise.allSettled([loadChains()]);
      return { ok: true, note, chainTitle: chainTitleById(chainId) };
    } catch (error: unknown) {
      const message = editorErrorMessage(error);
      snackbar.error(message);
      return { ok: false, error: message };
    }
  },

  async openChainInEditor(
    chainId: string,
    detail?: ChainDetailDTO
  ): Promise<string | null> {
    const wasEditor = appState.get().view === 'editor';
    const existing = editorStore.findChainTab(chainId);
    const title =
      detail?.displayTitle ??
      appState.get().chainSummaries.find((chain) => chain.id === chainId)?.displayTitle ??
      'Cadeia';

    const tab = editorStore.openChainTab(chainId, title);
    appState.set({ view: 'editor', selectedChainId: null, currentChain: null });
    pushNavigation('editor', chainId);

    if (detail) {
      editorStore.setChainTabNotes(tab.id, detail);
    } else if (existing) {
      await loadEditorChainTab(tab.id, chainId, true);
    }

    if (!wasEditor) {
      await loadChains();
    }

    return tab.id;
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

  async assignTag(chainId: string, tagName: string): Promise<void> {
    try {
      await assignTag.execute({ chainId, tagName });
      await loadTags();
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

  async toggleFavorite(chainId: string): Promise<void> {
    try {
      const isFav = await toggleFav.execute(chainId);
      snackbar.success(isFav ? 'Adicionado aos favoritos.' : 'Removido dos favoritos.');
      await loadChains();
      if (
        appState.get().view !== 'editor' &&
        appState.get().selectedChainId === chainId
      ) {
        await openChain(chainId, false);
      }
    } catch (e: unknown) {
      snackbar.error((e as Error).message);
    }
  },

  async archiveChain(chainId: string): Promise<void> {
    const confirmed = await showConfirmDialog({
      title: 'Arquivar cadeia?',
      body: 'A cadeia será movida para o arquivo. Você pode restaurá-la a qualquer momento.',
      icon: 'archive',
      confirmLabel: 'Arquivar',
    });
    if (!confirmed) return;
    const wasEditor = appState.get().view === 'editor';
    try {
      await archiveChain.execute(chainId);
      editorStore.closeChainTabs(chainId);
      snackbar.success('Cadeia arquivada.', {
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
      snackbar.success('Cadeia restaurada.');
      await loadChains();
    } catch (e: unknown) {
      snackbar.error((e as Error).message);
    }
  },

  async deleteChain(chainId: string): Promise<void> {
    if (getSettings().confirmBeforeTrash) {
      const confirmed = await showConfirmDialog({
        title: 'Mover para a lixeira?',
        body: 'A cadeia será movida para a lixeira. Você pode restaurá-la ou excluí-la permanentemente.',
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
      snackbar.success('Cadeia movida para a lixeira.', {
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
      body: 'Esta ação não pode ser desfeita. A cadeia e todas as suas notas serão removidas definitivamente.',
      icon: 'delete_forever',
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteChain.execute(chainId, true);
      editorStore.closeChainTabs(chainId);
      snackbar.success('Cadeia excluída permanentemente.');
      appState.set({ selectedChainId: null, currentChain: null });
      await loadChains();
    } catch (e: unknown) {
      snackbar.error((e as Error).message);
    }
  },

  async restoreFromTrash(chainId: string): Promise<void> {
    try {
      await restoreFromTrash.execute(chainId);
      snackbar.success('Cadeia restaurada da lixeira.');
      await loadChains();
    } catch (e: unknown) {
      snackbar.error((e as Error).message);
    }
  },

  async search(query: string): Promise<void> {
    appState.set({ searchQuery: query, view: 'search', isLoading: true });
    try {
      const results = await searchNotes.execute({ query });
      appState.set({ searchResults: results, isLoading: false });
    } catch (e: unknown) {
      appState.set({ isLoading: false });
      snackbar.error((e as Error).message);
    }
  },

  async loadTimeline(chainIds: string[], from?: string, to?: string): Promise<void> {
    appState.set({ isLoading: true, view: 'timeline' });
    try {
      const timeline = await getTimeline.execute({
        chainIds,
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
      });
      appState.set({ timeline, isLoading: false });
    } catch (e: unknown) {
      appState.set({ isLoading: false });
      snackbar.error((e as Error).message);
    }
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
      body: 'A tag será removida de todas as cadeias, mas as cadeias não serão excluídas.',
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

    if (view === 'editor' || view === 'chains' || view === 'favorites' || view === 'archived' || view === 'trash') {
      await loadChains();
    } else if (view === 'tags') {
      await loadTags();
    } else if (view === 'chain-detail' && chainId) {
      await openChain(chainId, false);
    }
  },

  openChain,
  loadEditorChainTab,
  loadChains,
  loadTags,
};
