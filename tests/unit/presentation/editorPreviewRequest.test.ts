import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChainDetailDTO } from '@application/dto/index.js';
import { EditorStore } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import { mountEditorView } from '@presentation/views/editor.js';
import { AppController } from '@presentation/pages/AppController.js';

let cleanup: (() => void) | null = null;

const detail: ChainDetailDTO = {
  id: 'chain-1',
  displayTitle: 'Projeto',
  noteCount: 1,
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-02T10:00:00.000Z',
  tagIds: [],
  tags: [],
  headerExcerpt: '',
  notes: [
    {
      id: 'note-1',
      content: 'Conteudo encontrado na busca',
      chainId: 'chain-1',
      position: 1,
      role: 'tail',
      createdAt: '2026-01-02T10:00:00.000Z',
      updatedAt: '2026-01-02T10:00:00.000Z',
    },
  ],
};

async function nextFrame(): Promise<void> {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

describe('Solicitação de preview no Editor', () => {
  beforeEach(() => {
    sessionStorage.clear();
    document.body.innerHTML = '<div id="editor-host"></div>';
    appState.set({
      view: 'editor',
      chainSummaries: [],
      isLoading: false,
      editorFocusRequest: null,
      editorPreviewRequest: null,
    });
    vi.spyOn(AppController, 'loadEditorChainTab').mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup?.();
    cleanup = null;
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('abre o preview da nota ao receber uma solicitação externa', async () => {
    const store = new EditorStore();
    const tab = store.openChainTab('chain-1', 'Projeto', {
      composerCollapsed: true,
    });
    store.setChainTabNotes(tab.id, detail);

    const host = document.getElementById('editor-host') as HTMLElement;
    cleanup = mountEditorView(host, store);

    appState.set({
      editorPreviewRequest: { noteId: 'note-1', query: 'encontrado' },
    });
    await nextFrame();
    await nextFrame();

    const preview = host.querySelector<HTMLElement>('#chain-note-preview');
    expect(preview?.hidden).toBe(false);
    expect(preview?.textContent).toContain('Conteudo encontrado na busca');
  });
});
