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

describe('ChainDocument - design da paginacao mensal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('exibe mes e direcao com icone e rotulo acessivel', () => {
    const view = mountChainDocument(makeTab(), makeHandlers());
    document.body.appendChild(view.element);

    const older = view.element.querySelector<HTMLButtonElement>(
      '[data-history-sentinel="older"] button'
    );
    expect(older?.type).toBe('button');
    expect(older?.getAttribute('aria-label')).toBe(
      'Ir para o mês anterior, Fevereiro de 2026'
    );
    expect(
      older?.querySelector('.chain-history-sentinel__hint')?.textContent
    ).toBe('Mês anterior');
    expect(
      older?.querySelector('.chain-history-sentinel__month')?.textContent
    ).toBe('Fevereiro de 2026');

    const olderIcon = older?.querySelector(
      '.chain-history-sentinel__icon'
    );
    expect(olderIcon?.textContent).toBe('arrow_back');
    expect(olderIcon?.getAttribute('aria-hidden')).toBe('true');
    expect(older?.firstElementChild).toBe(olderIcon);

    older?.click();

    const newer = view.element.querySelector<HTMLButtonElement>(
      '[data-history-sentinel="newer"] button'
    );
    expect(newer?.getAttribute('aria-label')).toBe(
      'Ir para o próximo mês, Março de 2026'
    );
    const newerIcon = newer?.querySelector('.chain-history-sentinel__icon');
    expect(newerIcon?.textContent).toBe('arrow_forward');
    expect(newerIcon?.getAttribute('aria-hidden')).toBe('true');
    expect(newer?.lastElementChild).toBe(newerIcon);

    view.destroy();
  });
});
