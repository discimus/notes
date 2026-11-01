import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import type { ChainTab } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import { mountChainDocument } from '@presentation/components/ChainDocument.js';

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
      makeNote('jan', new Date(2026, 0, 5, 12).toISOString()),
      makeNote('feb', new Date(2026, 1, 2, 12).toISOString()),
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

function openMenu(view: ReturnType<typeof mountChainDocument>): void {
  view.element
    .querySelector<HTMLButtonElement>('.chain-date-group__label')
    ?.click();
}

function selectPeriod(key: string): void {
  document
    .querySelector<HTMLButtonElement>(`[data-period-key="${key}"]`)
    ?.click();
}

function selectedIds(view: ReturnType<typeof mountChainDocument>): string[] {
  return [
    ...view.element.querySelectorAll<HTMLElement>(
      '.chain-note--period-selected'
    ),
  ].map((note) => note.getAttribute('data-note-id') ?? '');
}

describe('ChainDocument — expiração do destaque do período', () => {
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
          noteCount: 2,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-02-02T00:00:00.000Z',
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

  it('mantém por 5 s, aplica fade e limpa o mês ativo', () => {
    view = mountChainDocument(makeTab(), makeHandlers());
    document.body.appendChild(view.element);

    openMenu(view);
    selectPeriod('2026-02');

    expect(selectedIds(view)).toEqual(['feb']);

    vi.advanceTimersByTime(4999);
    expect(selectedIds(view)).toEqual(['feb']);
    expect(
      view.element.querySelectorAll('.chain-note--period-selected-expiring')
    ).toHaveLength(0);

    vi.advanceTimersByTime(1);
    expect(
      view.element.querySelectorAll('.chain-note--period-selected-expiring')
    ).toHaveLength(1);

    vi.advanceTimersByTime(300);
    expect(selectedIds(view)).toEqual([]);
    expect(
      view.element.querySelectorAll('.chain-note--period-selected-expiring')
    ).toHaveLength(0);
    expect(
      view.element.querySelector('#chain-period-status')?.textContent
    ).toBe('');

    openMenu(view);
    expect(
      document
        .querySelector('[data-period-key="2026-02"]')
        ?.hasAttribute('aria-current')
    ).toBe(false);
  });

  it('reinicia o tempo ao selecionar outro período', () => {
    view = mountChainDocument(makeTab(), makeHandlers());
    document.body.appendChild(view.element);

    openMenu(view);
    selectPeriod('2026-01');
    vi.advanceTimersByTime(4000);

    openMenu(view);
    selectPeriod('2026-02');

    expect(selectedIds(view)).toEqual(['feb']);

    vi.advanceTimersByTime(4000);
    expect(selectedIds(view)).toEqual(['feb']);

    vi.advanceTimersByTime(1000);
    expect(
      view.element.querySelectorAll('.chain-note--period-selected-expiring')
    ).toHaveLength(1);

    vi.advanceTimersByTime(300);
    expect(selectedIds(view)).toEqual([]);
  });

  it('não reinicia o tempo em re-renderizações durante o destaque', () => {
    view = mountChainDocument(makeTab(), makeHandlers());
    document.body.appendChild(view.element);

    openMenu(view);
    selectPeriod('2026-02');
    vi.advanceTimersByTime(3000);

    view.update(makeTab());
    expect(selectedIds(view)).toEqual(['feb']);

    vi.advanceTimersByTime(2000);
    expect(
      view.element.querySelectorAll('.chain-note--period-selected-expiring')
    ).toHaveLength(1);

    vi.advanceTimersByTime(300);
    expect(selectedIds(view)).toEqual([]);
  });
});
