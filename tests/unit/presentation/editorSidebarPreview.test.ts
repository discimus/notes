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

describe('EditorSidebar preview tabs', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('diferencia clique simples de duplo clique na cadeia', () => {
    const onOpenChain = vi.fn();
    const onOpenChainPinned = vi.fn();
    const view = mountEditorSidebar({
      onOpenChain,
      onOpenChainPinned,
      onNewChain: vi.fn(),
      onFilter: vi.fn(),
      onTogglePin: vi.fn(),
    });
    document.body.appendChild(view.element);

    view.update(
      { ...appState.get(), chainSummaries: [makeChain()], chainFilterQuery: '' },
      null
    );

    const item = view.element.querySelector<HTMLElement>('.chain-item')!;
    item.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    expect(onOpenChain).toHaveBeenCalledWith('chain-1');
    expect(onOpenChainPinned).not.toHaveBeenCalled();

    item.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 2 }));
    expect(onOpenChainPinned).toHaveBeenCalledWith('chain-1');
    expect(item.getAttribute('aria-keyshortcuts')).toBe('Control+Enter Meta+Enter');
  });

  it('permite manter a aba aberta pelo teclado', () => {
    const onOpenChain = vi.fn();
    const onOpenChainPinned = vi.fn();
    const view = mountEditorSidebar({
      onOpenChain,
      onOpenChainPinned,
      onNewChain: vi.fn(),
      onFilter: vi.fn(),
      onTogglePin: vi.fn(),
    });
    document.body.appendChild(view.element);

    view.update(
      { ...appState.get(), chainSummaries: [makeChain()], chainFilterQuery: '' },
      null
    );

    const item = view.element.querySelector<HTMLElement>('.chain-item')!;
    item.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true })
    );
    expect(onOpenChainPinned).toHaveBeenCalledWith('chain-1');

    item.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onOpenChain).toHaveBeenCalledWith('chain-1');
  });
});
