import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChainSummaryDTO } from '@application/dto/index.js';
import { appState } from '@presentation/state/AppState.js';
import { EditorStore } from '@presentation/state/EditorStore.js';
import { AppController } from '@presentation/pages/AppController.js';
import { mountEditorView } from '@presentation/views/editor.js';

let cleanup: (() => void) | null = null;

const chain: ChainSummaryDTO = {
  id: 'chain-1',
  displayTitle: 'Projeto principal',
  noteCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  tagIds: [],
  tags: [],
  headerExcerpt: '',
};

function mount(): { host: HTMLElement; store: EditorStore } {
  document.body.innerHTML = '<div id="editor-host"></div>';
  const host = document.getElementById('editor-host') as HTMLElement;
  const store = new EditorStore();
  cleanup = mountEditorView(host, store);
  store.openChainTab('chain-1', 'Projeto principal');
  return { host, store };
}

function renameInput(host: HTMLElement): HTMLInputElement {
  const input = host.querySelector<HTMLInputElement>('.editor-tab__rename-input');
  if (!input) throw new Error('Input de rename não encontrado');
  return input;
}

describe('Editor chain rename', () => {
  beforeEach(() => {
    sessionStorage.clear();
    appState.set({
      view: 'editor',
      chainSummaries: [chain],
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

  it('renomeia pelo duplo clique na aba', async () => {
    const update = vi.spyOn(AppController, 'updateChainTitle').mockResolvedValue(undefined);
    const { host, store } = mount();
    const tab = store.getActiveTab()!;

    host
      .querySelector(`[data-tab-id="${tab.id}"] .editor-tab__label`)
      ?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

    const input = renameInput(host);
    expect(input.value).toBe('Projeto principal');

    input.value = 'Novo título';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(update).toHaveBeenCalledWith('chain-1', 'Novo título');
  });

  it('abre o input pelo item Renomear do menu da cadeia', () => {
    const { host, store } = mount();
    const tab = store.getActiveTab()!;

    host.querySelector<HTMLButtonElement>('#chain-more')?.click();
    const rename = [...document.querySelectorAll<HTMLButtonElement>('.chain-menu__item')]
      .find((item) => item.textContent?.includes('Renomear'));
    rename?.click();

    expect(renameInput(host).value).toBe('Projeto principal');
    expect(tab.kind).toBe('chain');
  });
});
