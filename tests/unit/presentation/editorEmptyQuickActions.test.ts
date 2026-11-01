import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EditorStore } from '@presentation/state/EditorStore.js';
import { mountEditorView } from '@presentation/views/editor.js';
import { AppController } from '@presentation/pages/AppController.js';
import { appState } from '@presentation/state/AppState.js';

let cleanup: (() => void) | null = null;

describe('Editor empty state quick actions', () => {
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

  function mountEmpty(store: EditorStore): HTMLElement {
    const host = document.getElementById('editor-host') as HTMLElement;
    cleanup = mountEditorView(host, store);
    const active = store.getActiveTab();
    if (active) store.closeTab(active.id);
    return host;
  }

  it('substitui o botão único pelas ações rápidas da cadeia', () => {
    const host = mountEmpty(new EditorStore());
    const panel = host.querySelector<HTMLElement>('#editor-panel');
    const group = panel?.querySelector<HTMLElement>('.chain-quick-actions');
    const actions = [
      ...(panel?.querySelectorAll<HTMLButtonElement>('.chain-quick-action') ?? []),
    ];

    expect(panel?.textContent).toContain('Nenhum documento aberto');
    expect(panel?.querySelector('#editor-empty-new')).toBeNull();
    expect(group?.getAttribute('role')).toBe('group');
    expect(group?.getAttribute('aria-label')).toBe('Adicionar conteúdo');
    expect(actions).toHaveLength(4);
    expect(actions.map((action) => action.lastElementChild?.textContent)).toEqual([
      'Documento',
      'Imagem',
      'Áudio',
      'Link',
    ]);
    expect(actions.filter((action) => action.disabled)).toHaveLength(3);
    expect(actions[0]?.disabled).toBe(false);
    expect(actions[1]?.getAttribute('aria-label')).toContain('em breve');
    expect(actions[2]?.getAttribute('aria-label')).toContain('em breve');
    expect(actions[3]?.getAttribute('aria-label')).toContain('em breve');
  });

  it('cria um rascunho ao acionar Documento', () => {
    const store = new EditorStore();
    const host = mountEmpty(store);

    host.querySelector<HTMLButtonElement>('#editor-empty-action-document')?.click();

    const snapshot = store.getSnapshot();
    expect(snapshot.tabs).toHaveLength(1);
    expect(snapshot.tabs[0]?.kind).toBe('draft');
    expect(host.querySelector<HTMLTextAreaElement>('#draft-textarea')).not.toBeNull();
  });
});
