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
    composerCollapsed: true,
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

function rect(top: number, height: number, bottom: number): DOMRect {
  return {
    top,
    height,
    bottom,
    left: 0,
    right: 800,
    width: 800,
    x: 0,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

describe('Chain action overlay space', () => {
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
    vi.useFakeTimers();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      return window.setTimeout(() => callback(0), 0) as unknown as number;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function mountMeasured() {
    const view = mountChainDocument(makeTab(), makeHandlers());
    const root = view.element;
    const footer = root.querySelector<HTMLElement>('.chain-document__footer');
    if (!footer) throw new Error('Footer não encontrado');

    let footerTop = 880;
    let footerHeight = 104;
    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue(rect(0, 1000, 1000));
    vi.spyOn(footer, 'getBoundingClientRect').mockImplementation(() =>
      rect(footerTop, footerHeight, footerTop + footerHeight)
    );

    return {
      view,
      root,
      setFooter: (top: number, height: number) => {
        footerTop = top;
        footerHeight = height;
      },
    };
  }

  it('mede dinamicamente o espaço do footer e atualiza ao mudar', () => {
    const { root, setFooter } = mountMeasured();

    window.dispatchEvent(new Event('resize'));
    vi.advanceTimersByTime(0);
    expect(root.style.getPropertyValue('--chain-actions-overlay-space')).toBe('120px');

    setFooter(936, 48);
    window.dispatchEvent(new Event('resize'));
    vi.advanceTimersByTime(0);
    expect(root.style.getPropertyValue('--chain-actions-overlay-space')).toBe('64px');
  });

  it('congela o espaço enquanto o compositor está aberto', () => {
    const { view, root, setFooter } = mountMeasured();

    window.dispatchEvent(new Event('resize'));
    vi.advanceTimersByTime(0);
    expect(root.style.getPropertyValue('--chain-actions-overlay-space')).toBe('120px');

    view.update(makeTab({ composerCollapsed: false }));
    vi.advanceTimersByTime(0);

    setFooter(700, 300);
    window.dispatchEvent(new Event('resize'));
    vi.advanceTimersByTime(0);
    expect(root.style.getPropertyValue('--chain-actions-overlay-space')).toBe('120px');

    view.update(makeTab({ composerCollapsed: true }));
    vi.advanceTimersByTime(0);
    expect(root.style.getPropertyValue('--chain-actions-overlay-space')).toBe('300px');
  });
});
