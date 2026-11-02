import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import type { ChainTab } from '@presentation/state/EditorStore.js';
import { mountChainDocument } from '@presentation/components/ChainDocument.js';

function note(index: number): NoteDTO {
  return {
    id: `note-${index}`,
    content: `Nota ${index}`,
    chainId: 'chain-1',
    position: index,
    role: 'tail',
    createdAt: '2026-01-02T10:00:00.000Z',
    updatedAt: '2026-01-02T10:00:00.000Z',
  };
}

function makeTab(count: number): ChainTab {
  return {
    kind: 'chain',
    id: 'tab-chain',
    chainId: 'chain-1',
    title: 'Projeto',
    notes: Array.from({ length: count }, (_, index) => note(index)),
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

describe('Histórico incremental da coleção', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('renderiza a página mais recente e carrega anteriores sob demanda', () => {
    const view = mountChainDocument(makeTab(200), makeHandlers());
    document.body.appendChild(view.element);

    expect(view.element.querySelectorAll('.chain-note')).toHaveLength(80);
    expect(
      view.element.querySelector('.chain-note')?.getAttribute('data-note-id')
    ).toBe('note-120');

    const older = view.element.querySelector<HTMLButtonElement>(
      '[data-history-sentinel="older"] button'
    );
    expect(older).not.toBeNull();
    expect(
      view.element.querySelector('[data-history-sentinel="newer"]')
    ).toBeNull();

    view.element.classList.add('chain-document--header-hidden');
    older?.click();

    expect(
      view.element.classList.contains('chain-document--header-hidden')
    ).toBe(false);

    expect(view.element.querySelectorAll('.chain-note')).toHaveLength(160);
    expect(
      view.element.querySelector('.chain-note')?.getAttribute('data-note-id')
    ).toBe('note-40');

    view.element
      .querySelector<HTMLButtonElement>('[data-history-sentinel="older"] button')
      ?.click();

    expect(view.element.querySelectorAll('.chain-note')).toHaveLength(200);
    expect(
      view.element.querySelector('[data-history-sentinel="older"]')
    ).toBeNull();

    view.destroy();
  });
});
