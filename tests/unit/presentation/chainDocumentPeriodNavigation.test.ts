import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import type { ChainTab } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import { mountChainDocument } from '@presentation/components/ChainDocument.js';

function localIso(
  year: number,
  monthIndex: number,
  day: number,
  hour = 12
): string {
  return new Date(year, monthIndex, day, hour).toISOString();
}

function makeNote(id: string, createdAt: string): NoteDTO {
  return {
    id,
    content: id,
    chainId: 'chain-1',
    position: 0,
    role: 'tail',
    createdAt,
    updatedAt: createdAt,
  };
}

function makeTab(): ChainTab {
  return {
    kind: 'chain',
    id: 'tab-chain',
    chainId: 'chain-1',
    title: 'Projeto principal',
    notes: [
      makeNote('feb-late', localIso(2026, 1, 20)),
      makeNote('jan', localIso(2026, 0, 5)),
      makeNote('feb-first', localIso(2026, 1, 2)),
    ],
    noteTabs: [{ id: 'note-tab-1', content: '' }],
    activeNoteTabId: 'note-tab-1',
    composerCollapsed: true,
    status: 'loaded',
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

describe('ChainDocument — navegação para o primeiro item do período', () => {
  let view: ReturnType<typeof mountChainDocument> | null = null;

  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 0;
    });
    appState.set({
      chainSummaries: [
        {
          id: 'chain-1',
          displayTitle: 'Projeto principal',
          noteCount: 3,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-02-20T00:00:00.000Z',
          tagIds: [],
          tags: [],
          headerExcerpt: '',
        },
      ],
    });
  });

  afterEach(() => {
    view?.destroy();
    view = null;
    vi.restoreAllMocks();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('foca a primeira nota do período na ordem da listagem', () => {
    view = mountChainDocument(makeTab(), makeHandlers());
    document.body.appendChild(view.element);

    view.element
      .querySelector<HTMLButtonElement>('.chain-date-group__label')
      ?.click();
    document
      .querySelector<HTMLButtonElement>('[data-period-key="2026-02"]')
      ?.click();

    const firstFebruaryNote = view.element.querySelector<HTMLElement>(
      '[data-note-id="feb-first"]'
    );

    expect(firstFebruaryNote).not.toBeNull();
    expect(document.activeElement).toBe(firstFebruaryNote);
  });
});
