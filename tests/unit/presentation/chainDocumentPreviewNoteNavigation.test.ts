import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import type { ChainTab } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import { mountChainDocument } from '@presentation/components/ChainDocument.js';

function localIso(year: number, monthIndex: number, day: number): string {
  return new Date(year, monthIndex, day, 12).toISOString();
}

function note(id: string, content: string, createdAt: string): NoteDTO {
  return {
    id,
    content,
    chainId: 'chain-1',
    position: 1,
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
      note('jan', 'Nota de janeiro', localIso(2026, 0, 2)),
      note('feb', 'Nota de fevereiro', localIso(2026, 1, 3)),
      note('mar', 'Nota de marco', localIso(2026, 2, 8)),
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
    onEditNote: vi.fn(),
    onCreateNote: vi.fn(),
    onSelectNote: vi.fn(),
    onCloseNote: vi.fn(),
  };
}

function navButton(
  view: ReturnType<typeof mountChainDocument>,
  direction: 'previous' | 'next'
): HTMLButtonElement {
  const button = view.element.querySelector<HTMLButtonElement>(
    `[data-preview-nav="${direction}"]`
  );
  if (!button) throw new Error(`Botao ${direction} nao encontrado`);
  return button;
}

function renderedNoteIds(
  view: ReturnType<typeof mountChainDocument>
): string[] {
  return [
    ...view.element.querySelectorAll<HTMLElement>('.chain-note'),
  ].map((element) => element.dataset['noteId'] ?? '');
}

describe('ChainDocument - navegacao na previa da nota', () => {
  let view: ReturnType<typeof mountChainDocument> | null = null;

  beforeEach(() => {
    document.body.innerHTML = '';
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
    document.body.innerHTML = '';
  });

  it('navega entre notas e troca a pagina do mes ao cruzar o limite', () => {
    view = mountChainDocument(makeTab(), makeHandlers());
    document.body.appendChild(view.element);

    view.element
      .querySelector<HTMLButtonElement>(
        '[data-note-id="mar"] .chain-note__preview'
      )
      ?.click();

    expect(navButton(view, 'previous').disabled).toBe(false);
    expect(navButton(view, 'next').disabled).toBe(true);

    navButton(view, 'previous').click();

    expect(renderedNoteIds(view)).toEqual(['feb']);
    expect(
      view.element.querySelector('#chain-note-preview')?.textContent
    ).toContain('Nota de fevereiro');
    expect(navButton(view, 'previous').disabled).toBe(false);
    expect(navButton(view, 'next').disabled).toBe(false);

    navButton(view, 'previous').click();

    expect(renderedNoteIds(view)).toEqual(['jan']);
    expect(navButton(view, 'previous').disabled).toBe(true);
    expect(navButton(view, 'next').disabled).toBe(false);

    navButton(view, 'next').click();

    expect(renderedNoteIds(view)).toEqual(['feb']);
    expect(
      view.element.querySelector('#chain-note-preview')?.textContent
    ).toContain('Nota de fevereiro');
  });
});
