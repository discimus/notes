import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChainSummaryDTO } from '@application/dto/index.js';
import { appState } from '@presentation/state/AppState.js';
import { mountEditorSidebar } from '@presentation/components/EditorSidebar.js';

function chain(id: string, title: string): ChainSummaryDTO {
  return {
    id,
    displayTitle: title,
    noteCount: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    tagIds: [],
    tags: [],
    headerExcerpt: '',
  };
}

function state(bulkMode: boolean, selection: string[] = []) {
  return {
    ...appState.get(),
    chainSummaries: [chain('chain-1', 'Projeto'), chain('chain-2', 'Rotina')],
    chainFilterQuery: '',
    chainsBulkMode: bulkMode,
    chainsBulkSelection: selection,
  };
}

function mount() {
  const handlers = {
    onOpenChain: vi.fn(),
    onNewChain: vi.fn(),
    onFilter: vi.fn(),
    onTogglePin: vi.fn(),
    onEnterBulkSelection: vi.fn(),
    onExitBulkSelection: vi.fn(),
    onToggleBulkSelection: vi.fn(),
    onArchiveSelectedChains: vi.fn(),
    onDeleteSelectedChains: vi.fn(),
  };
  const view = mountEditorSidebar(handlers);
  document.body.appendChild(view.element);
  return { view, handlers };
}

describe('seleÃ§Ã£o em massa no editor', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('exibe o botÃ£o de seleÃ§Ã£o sem texto na listagem', () => {
    const { view, handlers } = mount();
    view.update(state(false), null);

    const button = view.element.querySelector<HTMLButtonElement>(
      '#editor-sidebar-select'
    );
    expect(button?.textContent?.trim()).toBe('checklist');
    expect(button?.getAttribute('aria-pressed')).toBe('false');
    expect(
      button?.querySelector('.material-symbols-rounded')?.textContent
    ).toBe('checklist');
    expect(button?.hidden).toBe(false);

    button?.click();
    expect(handlers.onEnterBulkSelection).toHaveBeenCalledTimes(1);
  });

  it('marca coleÃ§Ãµes e executa aÃ§Ãµes em lote', () => {
    const { view, handlers } = mount();
    view.update(state(true, ['chain-2']), null);

    const bulk = view.element.querySelector<HTMLElement>('#editor-sidebar-bulk');
    const first = view.element.querySelector<HTMLElement>(
      '[data-chain-id="chain-1"]'
    );
    const second = view.element.querySelector<HTMLElement>(
      '[data-chain-id="chain-2"]'
    );

    expect(bulk?.hidden).toBe(false);
    expect(
      view.element.querySelector('#editor-sidebar-bulk-count')?.textContent
    ).toBe('1 selecionada');
    expect(first?.getAttribute('aria-selected')).toBe('false');
    expect(second?.getAttribute('aria-selected')).toBe('true');
    const select = view.element.querySelector<HTMLButtonElement>(
      '#editor-sidebar-select'
    );
    expect(select?.hidden).toBe(false);
    expect(select?.getAttribute('aria-pressed')).toBe('true');
    expect(
      select?.querySelector('.material-symbols-rounded')?.textContent
    ).toBe('close');
    expect(
      view.element.querySelector<HTMLButtonElement>('#editor-new-chain')?.hidden
    ).toBe(true);

    first?.click();
    expect(handlers.onToggleBulkSelection).toHaveBeenCalledWith('chain-1');
    expect(handlers.onOpenChain).not.toHaveBeenCalled();

    view.element
      .querySelector<HTMLButtonElement>('#editor-sidebar-bulk-archive')
      ?.click();
    view.element
      .querySelector<HTMLButtonElement>('#editor-sidebar-bulk-delete')
      ?.click();
    select?.click();

    expect(handlers.onArchiveSelectedChains).toHaveBeenCalledTimes(1);
    expect(handlers.onDeleteSelectedChains).toHaveBeenCalledTimes(1);
    expect(handlers.onExitBulkSelection).toHaveBeenCalledTimes(1);
  });

  it('desabilita aÃ§Ãµes sem coleÃ§Ãµes selecionadas', () => {
    const { view } = mount();
    view.update(state(true, []), null);

    expect(
      view.element.querySelector<HTMLButtonElement>(
        '#editor-sidebar-bulk-archive'
      )?.disabled
    ).toBe(true);
    expect(
      view.element.querySelector<HTMLButtonElement>(
        '#editor-sidebar-bulk-delete'
      )?.disabled
    ).toBe(true);
  });

  it('distingue a coleção ativa da coleção marcada', () => {
    const { view } = mount();
    view.update(state(true, []), 'chain-1');

    const item = view.element.querySelector<HTMLElement>(
      '[data-chain-id="chain-1"]'
    );
    expect(item?.classList.contains('chain-item--selection')).toBe(true);
    expect(item?.classList.contains('chain-item--active')).toBe(true);
    expect(item?.classList.contains('chain-item--selected')).toBe(false);
    expect(item?.getAttribute('aria-current')).toBe('true');
    expect(item?.getAttribute('aria-selected')).toBe('false');
  });
});


