import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import type { ChainTab } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import { mountChainDocument } from '@presentation/components/ChainDocument.js';

function localIso(year: number, monthIndex: number, day: number): string {
  return new Date(year, monthIndex, day, 12).toISOString();
}

function note(id: string, createdAt: string): NoteDTO {
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
    title: 'Projeto',
    notes: [
      note('jan', localIso(2026, 0, 2)),
      note('feb', localIso(2026, 1, 3)),
      note('mar', localIso(2026, 2, 8)),
    ],
    noteTabs: [],
    activeNoteTabId: null,
    composerCollapsed: true,
    status: 'loaded',
  };
}

function makeHandlers() {
  return {
    initialEditorMode: 'none' as const,
    onNoteInput: vi.fn(),
    onSaveNote: vi.fn(),
    onCreateNote: vi.fn(),
    onSelectNote: vi.fn(),
    onCloseNote: vi.fn(),
  };
}

function openMenu(view: ReturnType<typeof mountChainDocument>): void {
  view.element
    .querySelector<HTMLButtonElement>('.chain-date-group__label')
    ?.click();
}

function menuOption(key: string): HTMLButtonElement {
  const option = document.querySelector<HTMLButtonElement>(
    `[data-period-key="${key}"]`
  );
  if (!option) throw new Error(`Periodo ${key} nao encontrado`);
  return option;
}

describe('ChainDocument - mes da pagina no filtro de meses', () => {
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
          displayTitle: 'Projeto',
          noteCount: 3,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-03-08T00:00:00.000Z',
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

  it('realca o mes exibido e mantem o destaque apos expirar a selecao', () => {
    view = mountChainDocument(makeTab(), makeHandlers());
    document.body.appendChild(view.element);

    openMenu(view);
    expect(
      menuOption('2026-03').classList.contains(
        'period-menu__item--page-current'
      )
    ).toBe(true);
    expect(menuOption('2026-03').hasAttribute('aria-current')).toBe(false);

    menuOption('2026-02').click();
    vi.advanceTimersByTime(5300);

    openMenu(view);
    const february = menuOption('2026-02');
    expect(february.classList.contains('period-menu__item--page-current')).toBe(
      true
    );
    expect(february.dataset['periodPageCurrent']).toBe('true');
    expect(february.hasAttribute('aria-current')).toBe(false);
    expect(february.getAttribute('aria-label')).toContain('mês exibido');
    expect(
      menuOption('2026-03').classList.contains(
        'period-menu__item--page-current'
      )
    ).toBe(false);
    expect(document.activeElement).toBe(february);
  });
});
