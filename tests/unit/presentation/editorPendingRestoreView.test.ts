import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { appState } from '@presentation/state/AppState.js';
import { EditorStore } from '@presentation/state/EditorStore.js';
import { PendingDraftsCache } from '@presentation/state/PendingDraftsCache.js';
import { AppController } from '@presentation/pages/AppController.js';
import { mountEditorView } from '@presentation/views/editor.js';

let cleanup: (() => void) | null = null;

function createStore(): EditorStore {
  return new EditorStore(sessionStorage, new PendingDraftsCache(localStorage));
}

function mount(store: EditorStore): HTMLElement {
  document.body.innerHTML = '<div id="editor-host"></div>';
  const host = document.getElementById('editor-host') as HTMLElement;
  cleanup = mountEditorView(host, store);
  return host;
}

describe('Editor pending restore view', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    appState.set({
      view: 'editor',
      chainSummaries: [
        {
          id: 'chain-1',
          displayTitle: 'Projeto',
          noteCount: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
          tagIds: [],
          tags: [],
          headerExcerpt: '',
        },
      ],
      chainFilterQuery: '',
      isLoading: false,
    });
    vi.spyOn(AppController, 'loadEditorChainTab').mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup?.();
    cleanup = null;
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('mostra rascunho persistente após reabrir sem sessão', () => {
    const source = createStore();
    const draft = source.createDraftTab();
    source.updateDraftContent(draft.id, 'Conteúdo restaurado');
    source.updateDraftContentType(draft.id, 'code');
    source.flush();

    sessionStorage.clear();
    const restored = createStore();
    const host = mount(restored);
    const textarea = host.querySelector<HTMLTextAreaElement>('#draft-textarea')!;

    expect(textarea.value).toBe('Conteúdo restaurado');
    expect(textarea.classList.contains('editor-textarea--code')).toBe(true);
  });

  it('mostra nota pendente restaurada no compositor da coleção', () => {
    const source = createStore();
    const chain = source.openChainTab('chain-1', 'Projeto');
    const noteTab = source.getActiveChainNoteTab(chain.id)!;
    source.updateChainNoteTab(chain.id, noteTab.id, 'Nota restaurada');
    source.flush();

    sessionStorage.clear();
    const restored = createStore();
    const host = mount(restored);
    const composer = host.querySelector<HTMLTextAreaElement>(
      '#chain-composer-input'
    )!;

    expect(composer.value).toBe('Nota restaurada');
    expect(restored.getActiveChainNoteTab(chain.id)?.content).toBe(
      'Nota restaurada'
    );
  });
});
