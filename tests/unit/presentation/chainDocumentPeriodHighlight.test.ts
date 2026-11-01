import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import type { ChainTab } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import { mountChainDocument } from '@presentation/components/ChainDocument.js';

function localIso(
  year: number,
  monthIndex: number,
  day: number,
  hour = 12
): string {
  return new Date(year, monthIndex, day, hour).toISOString();
}

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

function makeTab(overrides: Partial<ChainTab> = {}): ChainTab {
  return {
    kind: 'chain',
    id: 'tab-chain',
    chainId: 'chain-1',
    title: 'Projeto principal',
    notes: [
      makeNote('jan-1', localIso(2026, 0, 5)),
      makeNote('jan-2', localIso(2026, 0, 20)),
      makeNote('feb-1', localIso(2026, 1, 2)),
    ],
    noteTabs: [{ id: 'note-tab-1', content: '' }],
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
    onCreateNote: vi.fn(),
    onSelectNote: vi.fn(),
    onCloseNote: vi.fn(),
    onNewDocument: vi.fn(),
  };
}

function openMenu(view: ReturnType<typeof mountChainDocument>): HTMLButtonElement {
  const button = view.element.querySelector<HTMLButtonElement>(
    '.chain-date-group__label'
  );
  if (!button) throw new Error('Badge de data não encontrado');
  button.click();
  return button;
}

function selectPeriod(key: string): void {
  const option = document.querySelector<HTMLButtonElement>(
    `[data-period-key="${key}"]`
  );
  if (!option) throw new Error(`Período ${key} não encontrado`);
  option.click();
}

describe('ChainDocument — destaque por período', () => {
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
          noteCount: 3,
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

  it('restaura o badge sticky como botão de período', () => {
    view = mountChainDocument(makeTab(), makeHandlers());
    document.body.appendChild(view.element);

    const buttons = view.element.querySelectorAll<HTMLButtonElement>(
      '.chain-date-group__label'
    );
    expect(buttons).toHaveLength(3);
    expect(buttons[0]?.closest('.chain-date-group__heading')).not.toBeNull();
    expect(buttons[0]?.type).toBe('button');
    expect(buttons[0]?.getAttribute('aria-haspopup')).toBe('menu');
    expect(buttons[0]?.getAttribute('aria-expanded')).toBe('false');
  });

  it('realça, pisca e navega para a primeira nota do período sem filtrar', () => {
    const handlers = makeHandlers();
    view = mountChainDocument(makeTab(), handlers);
    document.body.appendChild(view.element);

    openMenu(view);
    selectPeriod('2026-02');

    const firstFebruaryNote = view.element.querySelector<HTMLElement>(
      '[data-note-id="feb-1"]'
    );

    expect(view.element.querySelectorAll('.chain-note')).toHaveLength(3);
    expect(
      view.element.querySelector('#chain-note-count')?.textContent
    ).toBe('3 notas');
    expect(
      firstFebruaryNote?.classList.contains('chain-note--period-flash')
    ).toBe(true);
    expect(
      view.element
        .querySelector('[data-note-id="jan-1"]')
        ?.classList.contains('chain-note--period-flash')
    ).toBe(false);
    expect(document.activeElement).toBe(firstFebruaryNote);
    expect(document.querySelector('[role="menu"]')).toBeNull();

    vi.advanceTimersByTime(1200);

    expect(
      view.element.querySelectorAll('.chain-note--period-flash')
    ).toHaveLength(0);
  });

  it('reinicia o pulso ao trocar de período antes do fim da animação', () => {
    view = mountChainDocument(makeTab(), makeHandlers());
    document.body.appendChild(view.element);

    openMenu(view);
    selectPeriod('2026-01');
    expect(
      view.element
        .querySelector('[data-note-id="jan-1"]')
        ?.classList.contains('chain-note--period-flash')
    ).toBe(true);

    openMenu(view);
    selectPeriod('2026-02');

    expect(
      view.element
        .querySelector('[data-note-id="jan-1"]')
        ?.classList.contains('chain-note--period-flash')
    ).toBe(false);
    expect(
      view.element
        .querySelector('[data-note-id="feb-1"]')
        ?.classList.contains('chain-note--period-flash')
    ).toBe(true);

    vi.advanceTimersByTime(1200);
    expect(
      view.element.querySelectorAll('.chain-note--period-flash')
    ).toHaveLength(0);
  });

  it('não oferece a opção Todos e não fecha a edição ao usar Escape no badge', () => {
    const handlers = makeHandlers();
    view = mountChainDocument(
      makeTab({
        composerCollapsed: false,
        noteTabs: [
          {
            id: 'edit-tab',
            content: 'feb-1',
            editingNoteId: 'feb-1',
            baseContent: 'feb-1',
            baseContentType: 'text',
          },
        ],
        activeNoteTabId: 'edit-tab',
      }),
      handlers
    );
    document.body.appendChild(view.element);

    const anchor = openMenu(view);
    expect(document.querySelector('.period-menu')?.textContent).not.toContain(
      'Todos os períodos'
    );

    document
      .querySelector<HTMLButtonElement>('[data-period-key="2026-02"]')
      ?.click();
    expect(document.querySelector('.period-menu')).toBeNull();

    anchor.focus();
    anchor.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    );
    expect(handlers.onCloseNote).not.toHaveBeenCalled();
  });
});
