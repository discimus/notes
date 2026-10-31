import { appState } from '../state/AppState.js';
import type { AppView } from '../state/AppState.js';
import { snackbar } from '../components/Snackbar.js';
import { showConfirmDialog } from '../components/Dialog.js';
import { DraftStore } from '../state/DraftStore.js';
import { pushNavigation } from '../app/navigation.js';
import { getSettings } from '../app/settings.js';

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
      await openChain(result.id);
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
      await updateNote.execute({ chainId, noteId, content });
      snackbar.success('Nota atualizada.');
      await openChain(chainId);
    } catch (e: unknown) {
      snackbar.error((e as Error).message);
    }
  },

  async updateChainTitle(chainId: string, title: string | undefined): Promise<void> {
    try {
      await updateTitle.execute({ chainId, ...(title ? { title } : {}) });
      await openChain(chainId);
      await loadChains();
    } catch (e: unknown) {
      snackbar.error((e as Error).message);
    }
  },

  async assignTag(chainId: string, tagName: string): Promise<void> {
    try {
      await assignTag.execute({ chainId, tagName });
      await openChain(chainId);
      await loadTags();
    } catch (e: unknown) {
      snackbar.error((e as Error).message);
    }
  },

  async removeTag(chainId: string, tagId: string): Promise<void> {
    try {
      await removeTag.execute({ chainId, tagId });
      await openChain(chainId);
    } catch (e: unknown) {
      snackbar.error((e as Error).message);
    }
  },

  async toggleFavorite(chainId: string): Promise<void> {
    try {
      const isFav = await toggleFav.execute(chainId);
      snackbar.success(isFav ? 'Adicionado aos favoritos.' : 'Removido dos favoritos.');
      await loadChains();
      if (appState.get().selectedChainId === chainId) await openChain(chainId);
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
    try {
      await archiveChain.execute(chainId);
      snackbar.success('Cadeia arquivada.', {
        label: 'Desfazer',
        onClick: () => AppController.restoreChain(chainId),
      });
      appState.set({ selectedChainId: null, currentChain: null, view: 'chains' });
      pushNavigation('chains');
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
    try {
      await deleteChain.execute(chainId, false);
      snackbar.success('Cadeia movida para a lixeira.', {
        label: 'Desfazer',
        onClick: () => AppController.restoreFromTrash(chainId),
      });
      appState.set({ selectedChainId: null, currentChain: null, view: 'chains' });
      pushNavigation('chains');
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
    appState.set({
      view,
      selectedChainId: chainId ?? null,
      currentChain: null,
      chainFilterQuery: '',
    });
    pushNavigation(view, chainId);
    if (view === 'chains' || view === 'favorites' || view === 'archived' || view === 'trash') {
      await loadChains();
    } else if (view === 'tags') {
      await loadTags();
    } else if (view === 'chain-detail' && chainId) {
      await openChain(chainId, false);
    }
  },

  openChain,
  loadChains,
  loadTags,
};
