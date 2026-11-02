import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChainSummaryDTO } from '@application/dto/index.js';
import { appState } from '@presentation/state/AppState.js';
import { mountEditorSidebar } from '@presentation/components/EditorSidebar.js';

function makeChain(overrides: Partial<ChainSummaryDTO> = {}): ChainSummaryDTO {
  return {
    id: 'chain-1',
    displayTitle: 'Projeto Alpha',
    noteCount: 2,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    tagIds: [],
    tags: [],
    headerExcerpt: '',
    ...overrides,
  };
}

describe('EditorSidebar', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('lista coleções, marca a ativa e abre ao clicar', () => {
    const onOpenChain = vi.fn();
    const view = mountEditorSidebar({
      onOpenChain,
      onNewChain: vi.fn(),
      onFilter: vi.fn(),
      onTogglePin: vi.fn(),
    });
    document.body.appendChild(view.element);

    view.update(
      {
        ...appState.get(),
        chainSummaries: [
          makeChain(),
          makeChain({ id: 'chain-2', displayTitle: 'Rotina' }),
        ],
        chainFilterQuery: '',
      },
      'chain-2'
    );

    const items = [...view.element.querySelectorAll<HTMLElement>('.chain-item')];
    expect(items).toHaveLength(2);
    expect(items[0]?.classList.contains('chain-item--active')).toBe(false);
    expect(items[1]?.classList.contains('chain-item--active')).toBe(true);

    items[0]?.click();
    expect(onOpenChain).toHaveBeenCalledWith('chain-1');
  });

  it('ordena fixadas primeiro e alterna o pin sem abrir a coleção', () => {
    const onOpenChain = vi.fn();
    const onTogglePin = vi.fn();
    const view = mountEditorSidebar({
      onOpenChain,
      onNewChain: vi.fn(),
      onFilter: vi.fn(),
      onTogglePin,
    });
    document.body.appendChild(view.element);

    view.update(
      {
        ...appState.get(),
        chainSummaries: [
          makeChain(),
          makeChain({ id: 'chain-2', displayTitle: 'Rotina' }),
        ],
        chainFilterQuery: '',
        pinnedChainIds: ['chain-2'],
      },
      null
    );

    const items = [...view.element.querySelectorAll<HTMLElement>('.chain-item')];
    expect(items[0]?.getAttribute('data-chain-id')).toBe('chain-2');
    const pin = items[0]?.querySelector<HTMLButtonElement>('.chain-item__pin');
    expect(pin?.getAttribute('aria-pressed')).toBe('true');

    pin?.click();
    expect(onTogglePin).toHaveBeenCalledWith('chain-2');
    expect(onOpenChain).not.toHaveBeenCalled();
  });
  it('encaminha busca e criaÃ§Ã£o de nova coleção', () => {
    const onFilter = vi.fn();
    const onNewChain = vi.fn();
    const view = mountEditorSidebar({
      onOpenChain: vi.fn(),
      onNewChain,
      onFilter,
      onTogglePin: vi.fn(),
    });
    document.body.appendChild(view.element);

    const search = view.element.querySelector<HTMLInputElement>('#editor-sidebar-search');
    if (!search) throw new Error('Busca nÃ£o encontrada');
    search.value = 'projeto';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    expect(onFilter).toHaveBeenCalledWith('projeto');

    view.element.querySelector<HTMLButtonElement>('#editor-new-chain')?.click();
    expect(onNewChain).toHaveBeenCalled();
  });
});
