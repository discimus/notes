import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChainDetailDTO, NoteDTO } from '@application/dto/index.js';
import { EditorStore } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import { mountEditorView } from '@presentation/views/editor.js';
import { AppController } from '@presentation/pages/AppController.js';

const content = 'Primeira linha\nRevisão do código final';

const note: NoteDTO = {
  id: 'note-1',
  content,
  chainId: 'chain-1',
  position: 0,
  role: 'header',
  createdAt: '2026-01-02T10:00:00.000Z',
  updatedAt: '2026-01-02T10:00:00.000Z',
};

const detail: ChainDetailDTO = {
  id: 'chain-1',
  displayTitle: 'Projeto principal',
  noteCount: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  tagIds: [],
  tags: [],
  headerExcerpt: 'Primeira linha',
  notes: [note],
};

let cleanup: (() => void) | null = null;

describe('Foco da busca no editor', () => {
  beforeEach(() => {
    sessionStorage.clear();
    document.body.innerHTML = '<div id="editor-host"></div>';
    appState.set({
      view: 'editor',
      chainSummaries: [detail],
      editorFocusRequest: null,
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

  it('seleciona e foca o trecho encontrado quando o editor monta', async () => {
    const store = new EditorStore();
    const tab = store.openChainTab('chain-1', detail.displayTitle);
    store.setChainTabNotes(tab.id, detail);
    store.openChainNoteEditTab(tab.id, note);
    appState.set({
      editorFocusRequest: { noteId: note.id, query: 'revisao' },
    });

    const host = document.getElementById('editor-host') as HTMLElement;
    cleanup = mountEditorView(host, store);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    const composer = host.querySelector<HTMLTextAreaElement>(
      '#chain-composer-input'
    )!;
    const start = content.indexOf('Revisão');
    expect(document.activeElement).toBe(composer);
    expect(composer.selectionStart).toBe(start);
    expect(composer.selectionEnd).toBe(start + 'Revisão'.length);
    expect(appState.get().editorFocusRequest).toBeNull();
  });
});
