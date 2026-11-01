import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChainSummaryDTO } from '@application/dto/index.js';
import { EditorStore } from '@presentation/state/EditorStore.js';
import { mountEditorView } from '@presentation/views/editor.js';
import { AppController } from '@presentation/pages/AppController.js';
import { appState } from '@presentation/state/AppState.js';

let cleanup: (() => void) | null = null;

function makeChain(): ChainSummaryDTO {
  return {
    id: 'chain-1',
    displayTitle: 'Projeto principal',
    noteCount: 2,
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-02T10:00:00.000Z',
    tagIds: [],
    tags: [],
    headerExcerpt: 'Primeira nota',
  };
}

describe('Editor quick actions', () => {
  beforeEach(() => {
    sessionStorage.clear();
    document.body.innerHTML = '<div id="editor-host"></div>';
    appState.set({
      view: 'editor',
      chainSummaries: [makeChain()],
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

  it('alterna o compositor ao clicar em novo documento', () => {
    const store = new EditorStore();
    const host = document.getElementById('editor-host') as HTMLElement;
    cleanup = mountEditorView(host, store);

    const chain = store.openChainTab('chain-1', 'Projeto principal');
    store.setChainComposerCollapsed(chain.id, true);

    const collapsed = store.getTab(chain.id);
    expect(collapsed?.kind === 'chain' && collapsed.noteTabs).toHaveLength(1);
    expect(
      host.querySelector<HTMLElement>('#chain-composer-body')?.hidden
    ).toBe(true);

    host.querySelector<HTMLButtonElement>('#chain-action-document')?.click();

    const expanded = store.getTab(chain.id);
    expect(expanded?.kind === 'chain' && expanded.composerCollapsed).toBe(false);
    expect(expanded?.kind === 'chain' && expanded.noteTabs).toHaveLength(1);
    expect(
      host.querySelector<HTMLElement>('#chain-composer-body')?.hidden
    ).toBe(false);

    host.querySelector<HTMLButtonElement>('#chain-action-document')?.click();

    const closed = store.getTab(chain.id);
    expect(closed?.kind === 'chain' && closed.composerCollapsed).toBe(true);
    expect(
      host.querySelector<HTMLElement>('#chain-composer-body')?.hidden
    ).toBe(true);
  });

  it('recolhe o compositor ao clicar fora da área de nova nota', () => {
    const store = new EditorStore();
    const host = document.getElementById('editor-host') as HTMLElement;
    cleanup = mountEditorView(host, store);

    const chain = store.openChainTab('chain-1', 'Projeto principal');
    const isCollapsed = (): boolean => {
      const tab = store.getTab(chain.id);
      return tab?.kind === 'chain' && tab.composerCollapsed;
    };

    const composer = host.querySelector<HTMLElement>('#chain-composer')!;
    composer.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(isCollapsed()).toBe(false);

    const action = host.querySelector<HTMLButtonElement>('#chain-action-document')!;
    action.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(isCollapsed()).toBe(false);

    const menu = document.createElement('div');
    menu.setAttribute('role', 'menu');
    document.body.appendChild(menu);
    menu.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(isCollapsed()).toBe(false);
    menu.remove();

    const scroll = host.querySelector<HTMLElement>('#chain-document-scroll')!;
    scroll.dispatchEvent(new Event('pointerdown', { bubbles: true }));

    expect(isCollapsed()).toBe(true);
    expect(
      host.querySelector<HTMLElement>('#chain-composer-body')?.hidden
    ).toBe(true);
  });
});
