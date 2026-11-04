import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EditorStore } from '@presentation/state/EditorStore.js';
import { mountEditorView } from '@presentation/views/editor.js';
import { AppController } from '@presentation/pages/AppController.js';
import { appState } from '@presentation/state/AppState.js';

let cleanup: (() => void) | null = null;

describe('Editor inicial sem documento', () => {
  beforeEach(() => {
    sessionStorage.clear();
    document.body.innerHTML = '<div id="editor-host"></div>';
    appState.set({
      view: 'editor',
      chainSummaries: [],
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

  function mount(store: EditorStore): HTMLElement {
    const host = document.getElementById('editor-host') as HTMLElement;
    cleanup = mountEditorView(host, store, { createInitialDraft: false });
    return host;
  }

  it('abre a visão de nenhum documento quando não há coleção selecionada', () => {
    const store = new EditorStore();
    const host = mount(store);

    expect(store.getSnapshot().tabs).toHaveLength(0);
    expect(host.querySelector('#draft-textarea')).toBeNull();
    expect(host.querySelector('#editor-tabs [role="tab"]')).toBeNull();
    expect(host.querySelector('#editor-panel')?.textContent).toContain(
      'Nenhum documento aberto'
    );
  });

  it('mantém a criação de documento disponível na visão vazia', () => {
    const store = new EditorStore();
    const host = mount(store);

    host.querySelector<HTMLButtonElement>('#editor-empty-action-document')?.click();

    expect(store.getSnapshot().tabs).toHaveLength(1);
    expect(store.getActiveTab()?.kind).toBe('draft');
    expect(host.querySelector<HTMLTextAreaElement>('#draft-textarea')).not.toBeNull();
  });
});
