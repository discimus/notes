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

function makeNotes(): NoteDTO[] {
  return [
    makeNote('jan-1', localIso(2026, 0, 5)),
    makeNote('jan-2', localIso(2026, 0, 20)),
    makeNote('feb-1', localIso(2026, 1, 2)),
  ];
}

function makeTab(overrides: Partial<ChainTab> = {}): ChainTab {
  return {
    kind: 'chain',
    id: 'tab-chain',
    chainId: 'chain-1',
    title: 'Projeto principal',
    notes: makeNotes(),
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

function openMenu(view: ReturnType<typeof mountChainDocument>): void {
  const button = view.element.querySelector<HTMLButtonElement>(
    '.chain-date-group__label'
  );
  if (!button) throw new Error('Badge de data não encontrado');
  button.click();
}

function selectPeriod(key: string): void {
  const option = document.querySelector<HTMLButtonElement>(
    `[data-period-key="${key}"]`
  );
  if (!option) throw new Error(`Período ${key} não encontrado`);
  option.click();
}

function selectedNoteIds(
  view: ReturnType<typeof mountChainDocument>
): string[] {
  return [
    ...view.element.querySelectorAll<HTMLElement>(
      '.chain-note--period-selected'
    ),
  ].map((note) => note.getAttribute('data-note-id') ?? '');
}

describe('ChainDocument — seleção persistente de período', () => {
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

  it('mantém o background após o pulso e entre re-renderizações', () => {
    view = mountChainDocument(makeTab(), makeHandlers());
    document.body.appendChild(view.element);

    openMenu(view);
    selectPeriod('2026-02');

    expect(selectedNoteIds(view)).toEqual(['feb-1']);
    expect(
      view.element
        .querySelector('[data-note-id="feb-1"]')
        ?.classList.contains('chain-note--period-flash')
    ).toBe(true);
    expect(
      view.element.querySelector('#chain-period-status')?.textContent
    ).toContain('Fevereiro de 2026 selecionado');

    vi.advanceTimersByTime(1200);
    expect(
      view.element.querySelectorAll('.chain-note--period-flash')
    ).toHaveLength(0);
    expect(selectedNoteIds(view)).toEqual(['feb-1']);

    view.update(makeTab({ notes: makeNotes() }));

    expect(selectedNoteIds(view)).toEqual(['feb-1']);
  });

  it('inclui novas notas do período e troca o realce ao escolher outro mês', () => {
    view = mountChainDocument(makeTab(), makeHandlers());
    document.body.appendChild(view.element);

    openMenu(view);
    selectPeriod('2026-02');

    const feb2 = makeNote('feb-2', localIso(2026, 1, 15));
    const mar = makeNote('mar-1', localIso(2026, 2, 3));
    view.update(makeTab({ notes: [...makeNotes(), feb2, mar] }));

    expect(selectedNoteIds(view)).toEqual(['feb-1', 'feb-2']);

    openMenu(view);
    const activeOption = document.querySelector<HTMLButtonElement>(
      '[data-period-key="2026-02"]'
    );
    expect(activeOption?.getAttribute('aria-current')).toBe('true');
    expect(
      activeOption?.querySelector('.period-menu__check')?.textContent
    ).toBe('check');

    selectPeriod('2026-01');

    expect(selectedNoteIds(view)).toEqual(['jan-1', 'jan-2']);
    expect(
      view.element.querySelector('#chain-period-status')?.textContent
    ).toContain('Janeiro de 2026 selecionado');
  });
});
