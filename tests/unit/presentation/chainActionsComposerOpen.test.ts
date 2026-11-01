import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import type { ChainTab } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import { mountChainDocument } from '@presentation/components/ChainDocument.js';

const note: NoteDTO = {
  id: 'note-1',
  content: 'Conteúdo',
  chainId: 'chain-1',
  position: 0,
  role: 'header',
  createdAt: '2026-01-02T10:00:00.000Z',
  updatedAt: '2026-01-02T10:00:00.000Z',
};

function makeTab(overrides: Partial<ChainTab> = {}): ChainTab {
  return {
    kind: 'chain',
    id: 'tab-chain',
    chainId: 'chain-1',
    title: 'Projeto',
    notes: [note],
    noteTabs: [{ id: 'note-tab-1', content: '', contentType: 'text' }],
    activeNoteTabId: 'note-tab-1',
    composerCollapsed: false,
    status: 'loaded',
    ...overrides,
  };
}

function makeHandlers() {
  return {
    onNoteInput: vi.fn(),
    onSaveNote: vi.fn(),
    onEditNote: vi.fn(),
    onCreateNote: vi.fn(),
    onSelectNote: vi.fn(),
    onCloseNote: vi.fn(),
    onNewDocument: vi.fn(),
  };
}

describe('Chain quick actions with composer open', () => {
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

  function mount() {
    vi.useFakeTimers();
    let now = 0;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      return window.setTimeout(() => callback(0), 0) as unknown as number;
    });

    const view = mountChainDocument(makeTab(), makeHandlers());
    vi.advanceTimersByTime(0);
    now = 200;

    const scroll = view.element.querySelector<HTMLElement>('#chain-document-scroll');
    if (!scroll) throw new Error('Scroll da cadeia não encontrado');

    return { view, scroll };
  }

  it('mantém as ações compactas durante o scroll enquanto o compositor está aberto', () => {
    const { view, scroll } = mount();
    const root = view.element;
    const compactClass = 'chain-document--actions-compact';

    expect(root.classList.contains(compactClass)).toBe(true);

    scroll.scrollTop = 200;
    scroll.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(0);
    expect(root.classList.contains(compactClass)).toBe(true);

    scroll.scrollTop = 100;
    scroll.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(119);
    expect(root.classList.contains(compactClass)).toBe(true);

    vi.advanceTimersByTime(1);
    expect(root.classList.contains(compactClass)).toBe(true);

    scroll.scrollTop = 0;
    scroll.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(0);
    expect(root.classList.contains(compactClass)).toBe(true);
  });

  it('volta a seguir o scroll quando o compositor fecha', () => {
    const { view, scroll } = mount();
    const root = view.element;
    const compactClass = 'chain-document--actions-compact';

    view.update(makeTab({ composerCollapsed: true }));
    expect(root.classList.contains(compactClass)).toBe(false);

    scroll.scrollTop = 200;
    scroll.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(0);
    expect(root.classList.contains(compactClass)).toBe(true);

    scroll.scrollTop = 100;
    scroll.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(0);
    expect(root.classList.contains(compactClass)).toBe(true);

    vi.advanceTimersByTime(119);
    expect(root.classList.contains(compactClass)).toBe(true);

    vi.advanceTimersByTime(1);
    expect(root.classList.contains(compactClass)).toBe(false);
  });
});
