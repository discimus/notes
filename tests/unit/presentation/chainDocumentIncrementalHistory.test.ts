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
      note('jan-1', localIso(2026, 0, 2)),
      note('jan-2', localIso(2026, 0, 10)),
      note('feb-1', localIso(2026, 1, 3)),
      note('feb-2', localIso(2026, 1, 18)),
      note('mar-1', localIso(2026, 2, 1)),
      note('mar-2', localIso(2026, 2, 8)),
      note('mar-3', localIso(2026, 2, 20)),
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

describe('Histórico paginado por mês', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('renderiza apenas o mês mais recente e navega entre os meses', () => {
    const view = mountChainDocument(makeTab(), makeHandlers());
    document.body.appendChild(view.element);

    expect(renderedNoteIds(view)).toEqual(['mar-1', 'mar-2', 'mar-3']);

    const older = view.element.querySelector<HTMLButtonElement>(
      '[data-history-sentinel="older"] button'
    );
    expect(older).not.toBeNull();
    expect(older?.textContent).toContain('Fevereiro de 2026');
    expect(
      view.element.querySelector('[data-history-sentinel="newer"]')
    ).toBeNull();

    older?.click();

    expect(renderedNoteIds(view)).toEqual(['feb-1', 'feb-2']);
    const olderFromFebruary = view.element.querySelector<HTMLButtonElement>(
      '[data-history-sentinel="older"] button'
    );
    expect(olderFromFebruary?.textContent).toContain('Janeiro de 2026');

    olderFromFebruary?.click();

    expect(renderedNoteIds(view)).toEqual(['jan-1', 'jan-2']);
    expect(
      view.element.querySelector('[data-history-sentinel="older"]')
    ).toBeNull();
    expect(
      view.element.querySelector('[data-history-sentinel="newer"] button')
        ?.textContent
    ).toContain('Fevereiro de 2026');

    view.destroy();
  });
});
