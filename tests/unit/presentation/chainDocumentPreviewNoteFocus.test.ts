import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import type { ChainTab } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import { mountChainDocument } from '@presentation/components/ChainDocument.js';

function localIso(day: number, hour: number): string {
  return new Date(2026, 2, day, hour).toISOString();
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
      note('note-a', 'Primeira nota', localIso(8, 10)),
      note('note-b', 'Segunda nota', localIso(8, 11)),
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

describe('ChainDocument - foco animado na navegacao da previa', () => {
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
          noteCount: 2,
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-08T11:00:00.000Z',
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

  it('foca a nota de destino, anima o destaque e rola suavemente ate ela', () => {
    view = mountChainDocument(makeTab(), makeHandlers());
    document.body.appendChild(view.element);

    view.element
      .querySelector<HTMLButtonElement>(
        '[data-note-id="note-a"] .chain-note__preview'
      )
      ?.click();

    const scroll = view.element.querySelector<HTMLElement>(
      '#chain-document-scroll'
    )!;
    const target = view.element.querySelector<HTMLElement>(
      '[data-note-id="note-b"]'
    )!;
    const scrollTo = vi.fn();

    Object.defineProperty(scroll, 'clientHeight', {
      configurable: true,
      value: 200,
    });
    Object.defineProperty(scroll, 'scrollHeight', {
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(scroll, 'scrollTo', {
      configurable: true,
      value: scrollTo,
    });
    scroll.getBoundingClientRect = () =>
      ({ top: 0, bottom: 200, left: 0, right: 600, width: 600, height: 200 }) as DOMRect;
    target.getBoundingClientRect = () =>
      ({ top: 400, bottom: 500, left: 0, right: 600, width: 600, height: 100 }) as DOMRect;

    view.element
      .querySelector<HTMLButtonElement>('[data-preview-nav="next"]')
      ?.click();

    expect(document.activeElement).toBe(target);
    expect(target.classList.contains('chain-note--preview-focus')).toBe(true);
    expect(scrollTo).toHaveBeenCalledWith({
      top: 316,
      behavior: 'smooth',
    });
  });
});
