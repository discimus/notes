import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { appState } from '@presentation/state/AppState.js';
import { EditorStore } from '@presentation/state/EditorStore.js';
import { mountEditorView } from '@presentation/views/editor.js';
import { renderChainsLayout } from '@presentation/views/chains.js';
import { renderSearchLayout } from '@presentation/views/search.js';
import { renderTagsLayout } from '@presentation/views/tags.js';
import { renderTimelineLayout } from '@presentation/views/timeline.js';
import { AppController } from '@presentation/pages/AppController.js';

let cleanup: (() => void) | null = null;

describe('entradas móveis da navegação', () => {
  beforeEach(() => {
    sessionStorage.clear();
    document.body.innerHTML = '<div id="host"></div>';
    appState.set({
      view: 'chains',
      chainSummaries: [],
      allTags: [],
      searchQuery: '',
      searchResults: [],
      timelineEntries: [],
      timelineSelectedChainIds: [],
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

  it('expõe o toggle nos headers existentes de cada view', () => {
    const host = document.getElementById('host') as HTMLElement;

    host.appendChild(renderChainsLayout(appState.get()));
    expect(host.querySelector('.detail-panel__nav-row > .nav-toggle')).not.toBeNull();
    host.innerHTML = '';

    appState.set({ view: 'search' });
    host.appendChild(renderSearchLayout(appState.get()));
    expect(host.querySelector('.search-header > .nav-toggle')).not.toBeNull();
    host.innerHTML = '';

    appState.set({ view: 'tags' });
    host.appendChild(renderTagsLayout(appState.get()));
    expect(host.querySelector('.tags-header > .nav-toggle')).not.toBeNull();
    host.innerHTML = '';

    appState.set({ view: 'timeline' });
    host.appendChild(renderTimelineLayout(appState.get()));
    expect(host.querySelector('.timeline-panel__header > .nav-toggle')).not.toBeNull();
    host.innerHTML = '';

    appState.set({ view: 'editor' });
    cleanup = mountEditorView(host, new EditorStore());
    expect(host.querySelector('.editor-tabbar > .nav-toggle')).not.toBeNull();
  });

  it('mantém o toggle e as ações no header do detalhe da coleção', () => {
    const host = document.getElementById('host') as HTMLElement;
    appState.set({
      view: 'chain-detail',
      currentChain: {
        id: 'chain-1',
        displayTitle: 'Projeto',
        noteCount: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        tagIds: [],
        tags: [],
        headerExcerpt: '',
        notes: [],
      },
    });

    host.appendChild(renderChainsLayout(appState.get()));

    expect(host.querySelector('.detail-panel__title-row > .nav-toggle')).not.toBeNull();
    expect(
      host.querySelector('.detail-panel__actions [aria-label="Mais opções"]')
    ).not.toBeNull();
  });
});
