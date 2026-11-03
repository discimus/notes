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

function renderedNoteIds(
  view: ReturnType<typeof mountChainDocument>
): string[] {
  return [
    ...view.element.querySelectorAll<HTMLElement>('.chain-note'),
  ].map((element) => element.dataset['noteId'] ?? '');
}

describe('ChainDocument - link redundante para o mes anterior', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('repete o link do mes anterior ao fim da listagem e permite navegar', () => {
    const view = mountChainDocument(makeTab(), makeHandlers());
    document.body.appendChild(view.element);

    const olderLinks = view.element.querySelectorAll<HTMLButtonElement>(
      '[data-history-sentinel="older"] button'
    );
    expect(olderLinks).toHaveLength(2);
    expect(olderLinks[0]?.textContent).toContain('Fevereiro de 2026');
    expect(olderLinks[1]?.textContent).toContain('Fevereiro de 2026');

    const history = view.element.querySelector<HTMLElement>('#chain-history');
    const pagination = history?.lastElementChild;
    expect(pagination?.classList.contains('chain-history-pagination')).toBe(true);
    expect(
      pagination?.classList.contains('chain-history-pagination--single')
    ).toBe(true);
    expect(
      pagination?.querySelector('[data-history-sentinel="older"] button')
    ).not.toBeNull();

    olderLinks[1]?.click();

    expect(renderedNoteIds(view)).toEqual(['feb']);
    const linksFromFebruary = view.element.querySelectorAll<HTMLButtonElement>(
      '[data-history-sentinel="older"] button'
    );
    expect(linksFromFebruary).toHaveLength(2);
    expect(linksFromFebruary[0]?.textContent).toContain('Janeiro de 2026');
    expect(linksFromFebruary[1]?.textContent).toContain('Janeiro de 2026');

    view.destroy();
  });
});
