import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import type { ChainTab } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import { mountChainDocument } from '@presentation/components/ChainDocument.js';

function makeNote(overrides: Partial<NoteDTO> = {}): NoteDTO {
  return {
    id: 'note-1',
    content: 'Conteúdo da nota',
    chainId: 'chain-1',
    position: 0,
    role: 'header',
    createdAt: '2026-01-02T10:00:00.000Z',
    updatedAt: '2026-01-02T10:00:00.000Z',
    ...overrides,
  };
}

function makeTab(overrides: Partial<ChainTab> = {}): ChainTab {
  return {
    kind: 'chain',
    id: 'tab-chain',
    chainId: 'chain-1',
    title: 'Projeto principal',
    notes: [makeNote()],
    noteTabs: [{ id: 'note-tab-1', content: '' }],
    activeNoteTabId: 'note-tab-1',
    composerCollapsed: true,
    status: 'loaded',
    ...overrides,
  };
}

function makeHandlers() {
  return {
    onNoteInput: vi.fn(),
    onSaveNote: vi.fn(),
    onCreateNote: vi.fn(),
    onSelectNote: vi.fn(),
    onCloseNote: vi.fn(),
    onNewDocument: vi.fn(),
  };
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

describe('Restauração da prévia da coleção', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    appState.set({
      chainSummaries: [
        {
          id: 'chain-1',
          displayTitle: 'Projeto principal',
          noteCount: 1,
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
  });

  it('reabre a prévia sem animação de transição ao remontar', async () => {
    const first = mountChainDocument(makeTab(), makeHandlers());
    first.element
      .querySelector<HTMLButtonElement>(
        '[data-note-id="note-1"] .chain-note__preview'
      )
      ?.click();

    const scroll = first.element.querySelector<HTMLElement>(
      '#chain-document-scroll'
    )!;
    scroll.scrollTop = 96;
    const state = first.getViewState();
    expect(state.previewNoteId).toBe('note-1');
    expect(state.scrollTop).toBe(96);
    first.destroy();

    const restored = mountChainDocument(makeTab(), makeHandlers());
    restored.restoreViewState(state);

    expect(
      restored.element.classList.contains('chain-document--preview-restore')
    ).toBe(true);
    const previewHost =
      restored.element.querySelector<HTMLElement>('#chain-note-preview')!;
    expect(previewHost.hidden).toBe(false);
    expect(previewHost.textContent).toContain('Conteúdo da nota');
    expect(
      restored.element.querySelector<HTMLElement>('#chain-document-scroll')
        ?.scrollTop
    ).toBe(96);

    await nextFrame();

    expect(
      restored.element.classList.contains('chain-document--preview-restore')
    ).toBe(false);
    restored.destroy();
  });
});
