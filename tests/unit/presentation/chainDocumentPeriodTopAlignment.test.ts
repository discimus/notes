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

describe('ChainDocument — alinhamento ao topo da área útil', () => {
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

  it('posiciona a primeira nota abaixo do badge sticky, dentro da listagem', () => {
    view = mountChainDocument(makeTab(), makeHandlers());
    document.body.appendChild(view.element);

    const scroll = view.element.querySelector<HTMLElement>(
      '#chain-document-scroll'
    )!;
    const target = view.element.querySelector<HTMLElement>(
      '[data-note-id="feb"]'
    )!;
    const heading = target
      .closest('.chain-date-group')
      ?.querySelector<HTMLElement>('.chain-date-group__heading')!;

    scroll.scrollTop = 0;
    Object.defineProperty(scroll, 'clientHeight', {
      configurable: true,
      value: 200,
    });
    Object.defineProperty(scroll, 'scrollHeight', {
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(heading, 'offsetHeight', {
      configurable: true,
      value: 24,
    });
    scroll.getBoundingClientRect = () =>
      ({ top: 100, left: 0, width: 600, height: 200 }) as DOMRect;
    target.getBoundingClientRect = () =>
      ({ top: 500, left: 0, width: 600, height: 20 }) as DOMRect;

    view.element
      .querySelector<HTMLButtonElement>('.chain-date-group__label')
      ?.click();
    document
      .querySelector<HTMLButtonElement>('[data-period-key="2026-02"]')
      ?.click();

    expect(document.activeElement).toBe(target);
    expect(scroll.scrollTop).toBe(368);
  });
});
