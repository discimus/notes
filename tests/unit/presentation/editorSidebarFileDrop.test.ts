import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChainSummaryDTO } from '@application/dto/index.js';
import { appState } from '@presentation/state/AppState.js';
import { mountEditorSidebar } from '@presentation/components/EditorSidebar.js';

function makeChain(): ChainSummaryDTO {
  return {
    id: 'chain-1',
    displayTitle: 'Projeto',
    noteCount: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    tagIds: [],
    tags: [],
    headerExcerpt: '',
  };
}

function dragEvent(
  type: 'dragover' | 'drop',
  files: File[] = [],
  types: string[] = ['Files']
): DragEvent {
  const event = new Event(type, { bubbles: true, cancelable: true }) as DragEvent;
  Object.defineProperty(event, 'dataTransfer', {
    value: {
      types,
      files,
      dropEffect: 'none',
    },
  });
  return event;
}

describe('EditorSidebar file drop', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('destaca a coleção e encaminha o arquivo externo', () => {
    const onImportFiles = vi.fn();
    const view = mountEditorSidebar({
      onOpenChain: vi.fn(),
      onNewChain: vi.fn(),
      onFilter: vi.fn(),
      onTogglePin: vi.fn(),
      onImportFiles,
    });
    document.body.appendChild(view.element);
    view.update(
      {
        ...appState.get(),
        chainSummaries: [makeChain()],
        chainFilterQuery: '',
      },
      null
    );

    const item = view.element.querySelector<HTMLElement>('.chain-item')!;
    const file = new File(['Conteúdo'], 'notas.txt', { type: 'text/plain' });
    const over = dragEvent('dragover', [file]);
    item.dispatchEvent(over);

    expect(over.defaultPrevented).toBe(true);
    expect(item.classList.contains('chain-item--drop-target')).toBe(true);

    item.dispatchEvent(dragEvent('drop', [file]));

    expect(onImportFiles).toHaveBeenCalledWith('chain-1', [file]);
    expect(item.classList.contains('chain-item--drop-target')).toBe(false);
  });

  it('ignora drags que não são arquivos', () => {
    const onImportFiles = vi.fn();
    const view = mountEditorSidebar({
      onOpenChain: vi.fn(),
      onNewChain: vi.fn(),
      onFilter: vi.fn(),
      onTogglePin: vi.fn(),
      onImportFiles,
    });
    document.body.appendChild(view.element);
    view.update(
      {
        ...appState.get(),
        chainSummaries: [makeChain()],
        chainFilterQuery: '',
      },
      null
    );

    const item = view.element.querySelector<HTMLElement>('.chain-item')!;
    const over = dragEvent('dragover', [], ['text/plain']);
    item.dispatchEvent(over);

    expect(over.defaultPrevented).toBe(false);
    expect(item.classList.contains('chain-item--drop-target')).toBe(false);
  });
});
