import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChainTab } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import { mountChainDocument } from '@presentation/components/ChainDocument.js';

function makeTab(overrides: Partial<ChainTab> = {}): ChainTab {
  return {
    kind: 'chain',
    id: 'tab-chain',
    chainId: 'chain-1',
    title: 'Projeto',
    notes: [],
    noteTabs: [{ id: 'note-tab-1', content: '', contentType: 'text' }],
    activeNoteTabId: 'note-tab-1',
    composerCollapsed: true,
    status: 'idle',
    ...overrides,
  };
}

function makeHandlers(overrides: Record<string, unknown> = {}) {
  return {
    onNoteInput: vi.fn(),
    onSaveNote: vi.fn(),
    onCreateNote: vi.fn(),
    onSelectNote: vi.fn(),
    onCloseNote: vi.fn(),
    onNewDocument: vi.fn(),
    ...overrides,
  };
}

describe('Chain quick actions', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    appState.set({
      chainSummaries: [
        {
          id: 'chain-1',
          displayTitle: 'Projeto',
          noteCount: 0,
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

  it('renderiza as quatro ações e mantém as futuras desabilitadas', () => {
    const handlers = makeHandlers();
    const view = mountChainDocument(makeTab(), handlers);
    const actions = [...view.element.querySelectorAll<HTMLButtonElement>('.chain-quick-action')];
    const footer = view.element.querySelector('.chain-document__footer');
    const scroll = view.element.querySelector('#chain-document-scroll');

    expect(actions).toHaveLength(4);
    expect(footer?.contains(actions[0] ?? null)).toBe(true);
    expect(scroll?.contains(actions[0] ?? null)).toBe(false);
    for (const action of actions) {
      expect(action.firstElementChild?.classList.contains('chain-quick-action__icon-wrap')).toBe(
        true
      );
      expect(action.lastElementChild?.classList.contains('chain-quick-action__label')).toBe(
        true
      );
    }
    expect(actions.filter((action) => action.disabled)).toHaveLength(3);
    expect(actions.map((action) => action.lastElementChild?.textContent)).toEqual([
      'Documento',
      'Imagem',
      'Áudio',
      'Link',
    ]);
    expect(actions[0]?.getAttribute('aria-controls')).toBe('chain-composer-body');
    expect(actions[0]?.getAttribute('aria-expanded')).toBe('false');
    expect(actions[1]?.getAttribute('aria-label')).toContain('em breve');
    expect(actions[2]?.getAttribute('aria-label')).toContain('em breve');
    expect(actions[3]?.getAttribute('aria-label')).toContain('em breve');

    actions[0]?.click();
    expect(handlers.onNewDocument).toHaveBeenCalledTimes(1);
  });

  it('mostra dot badge apenas quando há nota não salva', () => {
    const hiddenView = mountChainDocument(makeTab(), makeHandlers());
    expect(
      hiddenView.element.querySelector<HTMLElement>('#chain-unsaved-badge')?.hidden
    ).toBe(true);

    document.body.innerHTML = '';
    const dirtyView = mountChainDocument(
      makeTab({
        noteTabs: [{ id: 'note-tab-1', content: 'Rascunho', contentType: 'text' }],
      }),
      makeHandlers()
    );
    const badge = dirtyView.element.querySelector<HTMLElement>('#chain-unsaved-badge');
    const action = dirtyView.element.querySelector<HTMLButtonElement>(
      '#chain-action-document'
    );

    expect(badge?.hidden).toBe(false);
    expect(action?.getAttribute('aria-label')).toBe('Documento, 1 nota não salva');
  });

  it('compacta ao descer e expande ao subir após o delay', () => {
    vi.useFakeTimers();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      return window.setTimeout(() => callback(0), 0) as unknown as number;
    });

    const view = mountChainDocument(makeTab(), makeHandlers());
    const list = view.element.querySelector<HTMLElement>('#chain-document-scroll')!;

    list.scrollTop = 200;
    list.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(0);
    expect(view.element.classList.contains('chain-document--actions-compact')).toBe(true);

    list.scrollTop = 100;
    list.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(0);
    expect(view.element.classList.contains('chain-document--actions-compact')).toBe(true);
    expect(vi.getTimerCount()).toBe(1);

    vi.advanceTimersByTime(119);
    expect(view.element.classList.contains('chain-document--actions-compact')).toBe(true);

    vi.advanceTimersByTime(1);
    expect(view.element.classList.contains('chain-document--actions-compact')).toBe(false);
  });

  it('cancela a expansão se voltar a descer antes do delay', () => {
    vi.useFakeTimers();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      return window.setTimeout(() => callback(0), 0) as unknown as number;
    });

    const view = mountChainDocument(makeTab(), makeHandlers());
    const list = view.element.querySelector<HTMLElement>('#chain-document-scroll')!;

    list.scrollTop = 200;
    list.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(0);
    list.scrollTop = 180;
    list.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(0);
    list.scrollTop = 200;
    list.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(0);

    vi.advanceTimersByTime(200);
    expect(view.element.classList.contains('chain-document--actions-compact')).toBe(true);
  });
});
