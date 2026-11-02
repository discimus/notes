import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import type { ChainTab } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import { mountChainDocument } from '@presentation/components/ChainDocument.js';
import { notePeriodKey } from '@presentation/app/editorGrouping.js';

function localIso(year: number, monthIndex: number, day: number): string {
  return new Date(year, monthIndex, day, 12).toISOString();
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

function makeManyNotes(): NoteDTO[] {
  const notes: NoteDTO[] = [];
  let index = 0;
  for (let monthIndex = 0; monthIndex < 29; monthIndex += 1) {
    const year = 2023 + Math.floor(monthIndex / 12);
    const month = monthIndex % 12;
    const count = monthIndex === 0 ? 30 : 30;
    for (let day = 0; day < count; day += 1) {
      notes.push(
        makeNote(
          `note-${index}`,
          localIso(year, month, (day % 28) + 1)
        )
      );
      index += 1;
    }
  }
  return notes;
}

function makeTab(): ChainTab {
  return {
    kind: 'chain',
    id: 'tab-chain',
    chainId: 'chain-1',
    title: 'Projeto grande',
    notes: makeManyNotes(),
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

describe('ChainDocument — período em coleção grande', () => {
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
          displayTitle: 'Projeto grande',
          noteCount: 870,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2025-05-20T00:00:00.000Z',
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

  it('renderiza e foca a primeira nota do mês mais antigo', () => {
    const tab = makeTab();
    view = mountChainDocument(tab, makeHandlers());
    document.body.appendChild(view.element);

    view.element
      .querySelector<HTMLButtonElement>('.chain-date-group__label')
      ?.click();
    document
      .querySelector<HTMLButtonElement>('[data-period-key="2023-01"]')
      ?.click();

    const firstMonthNotes = tab.notes.filter(
      (note) => notePeriodKey(new Date(note.createdAt)) === '2023-01'
    );
    const rendered = [
      ...view.element.querySelectorAll<HTMLElement>('.chain-note'),
    ].map((element) => element.dataset['noteId']);

    expect(rendered).toHaveLength(firstMonthNotes.length);
    expect(rendered).toContain(firstMonthNotes[0]?.id);
    expect(document.activeElement).toBe(
      view.element.querySelector(`[data-note-id="${firstMonthNotes[0]?.id}"]`)
    );
  });
});
