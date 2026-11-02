import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

function state(selection: string[] = []) {
  return {
    ...appState.get(),
    chainSummaries: [chain('chain-1', 'Projeto'), chain('chain-2', 'Rotina')],
    chainFilterQuery: '',
    chainsBulkMode: true,
    chainsBulkSelection: selection,
  };
}

describe('selecionar todas as coleções na sidebar', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('encaminha as coleções visíveis ao alternar todas', () => {
    const onToggleAllChains = vi.fn();
    const view = mountEditorSidebar({
      onOpenChain: vi.fn(),
      onNewChain: vi.fn(),
      onFilter: vi.fn(),
      onTogglePin: vi.fn(),
      onEnterBulkSelection: vi.fn(),
      onExitBulkSelection: vi.fn(),
      onToggleBulkSelection: vi.fn(),
      onToggleAllChains,
    });
    document.body.appendChild(view.element);
    view.update(state(), null);

    const input = view.element.querySelector<HTMLInputElement>(
      '#editor-sidebar-bulk-all'
    )!;
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));

    expect(onToggleAllChains).toHaveBeenCalledWith(['chain-1', 'chain-2']);
  });

  it('reflete estado marcado e indeterminado', () => {
    const view = mountEditorSidebar({
      onOpenChain: vi.fn(),
      onNewChain: vi.fn(),
      onFilter: vi.fn(),
      onTogglePin: vi.fn(),
      onEnterBulkSelection: vi.fn(),
      onExitBulkSelection: vi.fn(),
      onToggleBulkSelection: vi.fn(),
      onToggleAllChains: vi.fn(),
    });
    document.body.appendChild(view.element);

    view.update(state(['chain-1', 'chain-2']), null);
    expect(
      view.element.querySelector<HTMLInputElement>('#editor-sidebar-bulk-all')
        ?.checked
    ).toBe(true);

    view.update(state(['chain-1']), null);
    const input = view.element.querySelector<HTMLInputElement>(
      '#editor-sidebar-bulk-all'
    )!;
    expect(input.checked).toBe(false);
    expect(input.indeterminate).toBe(true);
  });
});
