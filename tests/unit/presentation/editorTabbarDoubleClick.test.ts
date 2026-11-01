import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EditorStore } from '@presentation/state/EditorStore.js';
import { mountEditorView } from '@presentation/views/editor.js';
import { AppController } from '@presentation/pages/AppController.js';
import { appState } from '@presentation/state/AppState.js';

let cleanup: (() => void) | null = null;

describe('Editor tabbar double click', () => {
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
    cleanup = mountEditorView(host, store);
    return host;
  }

  it('cria um documento de texto com duplo clique na row da tabbar', () => {
    const store = new EditorStore();
    const host = mount(store);
    const tabbar = host.querySelector<HTMLElement>('.editor-tabbar');
    if (!tabbar) throw new Error('Tabbar não encontrada');

    expect(store.getSnapshot().tabs).toHaveLength(1);

    tabbar.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

    const tabs = store.getSnapshot().tabs;
    expect(tabs).toHaveLength(2);
    expect(tabs[1]?.kind).toBe('draft');
    expect(host.querySelectorAll('#draft-textarea')).toHaveLength(1);
  });

  it('não cria documento ao dar duplo clique em ações da row', () => {
    const store = new EditorStore();
    const host = mount(store);

    host
      .querySelector<HTMLButtonElement>('#editor-new-tab')
      ?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    host
      .querySelector<HTMLButtonElement>('[role="tab"]')
      ?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

    expect(store.getSnapshot().tabs).toHaveLength(1);
  });
});
