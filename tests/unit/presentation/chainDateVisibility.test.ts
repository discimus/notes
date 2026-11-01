import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import type { ChainTab } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import { mountChainDocument } from '@presentation/components/ChainDocument.js';

function makeNote(overrides: Partial<NoteDTO> = {}): NoteDTO {
  return {
    id: 'note-1',
    content: 'Conteúdo da nota',
    chainId: 'chain-1',
    position: 0,
    role: 'header',
    createdAt: '2026-01-02T10:00:00.000Z',
    updatedAt: '2026-01-02T10:00:00.000Z',
    ...overrides,
  };
}

function makeTab(): ChainTab {
  return {
    kind: 'chain',
    id: 'tab-chain',
    chainId: 'chain-1',
    title: 'Projeto',
    notes: [
      makeNote(),
      makeNote({
        id: 'note-2',
        content: 'Nota do dia seguinte',
        position: 1,
        role: 'tail',
        createdAt: '2026-01-03T10:00:00.000Z',
      }),
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

describe('Chain date label visibility', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    appState.set({
      chainSummaries: [
        {
          id: 'chain-1',
          displayTitle: 'Projeto',
          noteCount: 2,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-03T00:00:00.000Z',
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
    const labels = [
      ...view.element.querySelectorAll<HTMLElement>('.chain-date-group__label'),
    ];
    if (!scroll) throw new Error('Scroll da cadeia não encontrado');

    return { view, scroll, labels };
  }

  it('oculta ao descer e reexibe ao subir após o delay', () => {
    const { view, scroll, labels } = mount();
    const root = view.element;
    const hiddenClass = 'chain-document--date-hidden';

    expect(labels).toHaveLength(2);
    expect(root.classList.contains(hiddenClass)).toBe(false);

    scroll.scrollTop = 200;
    scroll.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(0);
    expect(root.classList.contains(hiddenClass)).toBe(true);

    scroll.scrollTop = 100;
    scroll.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(0);
    expect(root.classList.contains(hiddenClass)).toBe(true);

    vi.advanceTimersByTime(119);
    expect(root.classList.contains(hiddenClass)).toBe(true);

    vi.advanceTimersByTime(1);
    expect(root.classList.contains(hiddenClass)).toBe(false);
    expect(labels).toHaveLength(2);
    expect(labels.every((label) => root.contains(label))).toBe(true);
  });

  it('reexibe imediatamente ao voltar ao topo', () => {
    const { view, scroll } = mount();
    const root = view.element;
    const hiddenClass = 'chain-document--date-hidden';

    scroll.scrollTop = 200;
    scroll.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(0);
    expect(root.classList.contains(hiddenClass)).toBe(true);

    scroll.scrollTop = 0;
    scroll.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(0);
    expect(root.classList.contains(hiddenClass)).toBe(false);
  });
});
