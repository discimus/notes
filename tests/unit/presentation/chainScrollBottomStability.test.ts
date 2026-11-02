import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import type { ChainTab } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import { mountChainDocument } from '@presentation/components/ChainDocument.js';

const note: NoteDTO = {
  id: 'note-1',
  content: 'Conteúdo muito extenso '.repeat(80),
  chainId: 'chain-1',
  position: 0,
  role: 'header',
  createdAt: '2026-01-02T10:00:00.000Z',
  updatedAt: '2026-01-02T10:00:00.000Z',
};

const tab: ChainTab = {
  kind: 'chain',
  id: 'tab-chain',
  chainId: 'chain-1',
  title: 'Projeto',
  notes: [note],
  noteTabs: [{ id: 'note-tab-1', content: '' }],
  activeNoteTabId: 'note-tab-1',
  composerCollapsed: true,
  status: 'loaded',
};

function handlers() {
  return {
    onNoteInput: vi.fn(),
    onSaveNote: vi.fn(),
    onCreateNote: vi.fn(),
    onSelectNote: vi.fn(),
    onCloseNote: vi.fn(),
    onNewDocument: vi.fn(),
  };
}

describe('Estabilidade do scroll no fim da coleção', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    appState.set({
      chainSummaries: [
        {
          id: 'chain-1',
          displayTitle: 'Projeto',
          noteCount: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
          tagIds: [],
          tags: [],
          headerExcerpt: '',
        },
      ],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('não reexpande o header quando o clamp do layout ocorre no fim', () => {
    vi.useFakeTimers();
    let now = 0;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      return window.setTimeout(() => callback(0), 0) as unknown as number;
    });

    const view = mountChainDocument(tab, handlers());
    document.body.appendChild(view.element);
    const scroll = view.element.querySelector<HTMLElement>(
      '#chain-document-scroll'
    )!;

    Object.defineProperty(scroll, 'scrollHeight', {
      configurable: true,
      value: 2000,
    });
    Object.defineProperty(scroll, 'clientHeight', {
      configurable: true,
      value: 400,
    });

    vi.advanceTimersByTime(0);
    now = 200;

    scroll.scrollTop = 1500;
    scroll.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(0);

    scroll.scrollTop = 1600;
    scroll.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(0);

    vi.advanceTimersByTime(50);
    Object.defineProperty(scroll, 'clientHeight', {
      configurable: true,
      value: 450,
    });
    scroll.scrollTop = 1550;
    scroll.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(0);

    vi.advanceTimersByTime(500);

    expect(
      view.element.classList.contains('chain-document--header-hidden')
    ).toBe(true);
    expect(
      view.element.classList.contains('chain-document--actions-compact')
    ).toBe(true);
  });
});
