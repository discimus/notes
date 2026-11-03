import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import type { ChainTab } from '@presentation/state/EditorStore.js';
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

describe('ChainDocument - linha unica de paginacao mensal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('agrupa anterior e proximo no rodape com rotulos compactos', () => {
    const view = mountChainDocument(makeTab(), makeHandlers());
    document.body.appendChild(view.element);

    const latestPagination = view.element.querySelector<HTMLElement>(
      '#chain-history > .chain-history-pagination'
    );
    expect(latestPagination?.getAttribute('aria-label')).toBe(
      'Paginação por mês'
    );
    expect(
      latestPagination?.classList.contains('chain-history-pagination--single')
    ).toBe(true);

    view.element
      .querySelector<HTMLButtonElement>(
        '[data-history-sentinel="older"] button'
      )
      ?.click();

    const pagination = view.element.querySelector<HTMLElement>(
      '#chain-history > .chain-history-pagination'
    );
    expect(pagination).not.toBeNull();
    expect(
      pagination?.classList.contains('chain-history-pagination--single')
    ).toBe(false);

    const items = [
      ...(pagination?.querySelectorAll<HTMLElement>(
        '.chain-history-pagination__item'
      ) ?? []),
    ];
    expect(items.map((item) => item.dataset['historySentinel'])).toEqual([
      'older',
      'newer',
    ]);

    const [olderButton, newerButton] = items.map((item) =>
      item.querySelector<HTMLButtonElement>('button')
    );
    expect(olderButton?.classList.contains('chain-history-sentinel__button--compact')).toBe(
      true
    );
    expect(newerButton?.classList.contains('chain-history-sentinel__button--compact')).toBe(
      true
    );
    expect(olderButton?.querySelector('.chain-history-sentinel__hint')).toBeNull();
    expect(newerButton?.querySelector('.chain-history-sentinel__hint')).toBeNull();
    expect(
      olderButton?.querySelector('.chain-history-sentinel__month')?.textContent
    ).toBe('Janeiro de 2026');
    expect(
      newerButton?.querySelector('.chain-history-sentinel__month')?.textContent
    ).toBe('Março de 2026');
    expect(olderButton?.getAttribute('aria-label')).toBe(
      'Ir para o mês anterior, Janeiro de 2026'
    );
    expect(newerButton?.getAttribute('aria-label')).toBe(
      'Ir para o próximo mês, Março de 2026'
    );

    view.destroy();
  });
});
