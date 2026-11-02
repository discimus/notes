import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import type { ChainTab } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import { mountChainDocument } from '@presentation/components/ChainDocument.js';

const note: NoteDTO = {
  id: 'note-1',
  content: 'Header',
  chainId: 'chain-1',
  position: 0,
  role: 'header',
  createdAt: '2026-01-02T10:00:00.000Z',
  updatedAt: '2026-01-02T10:00:00.000Z',
};

function makeTab(): ChainTab {
  return {
    kind: 'chain',
    id: 'tab-chain',
    chainId: 'chain-1',
    title: 'Projeto',
    notes: [note],
    noteTabs: [{ id: 'note-tab-1', content: '' }],
    activeNoteTabId: 'note-tab-1',
    composerCollapsed: false,
    status: 'loaded',
  };
}

function dropEvent(files: File[]): DragEvent {
  const event = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent;
  Object.defineProperty(event, 'dataTransfer', {
    value: { types: ['Files'], files, dropEffect: 'none' },
  });
  return event;
}

describe('ChainDocument file import', () => {
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

  it('oferece seletor acessível e aceita drop na área da coleção', () => {
    const onImportFiles = vi.fn();
    const view = mountChainDocument(makeTab(), {
      onNoteInput: vi.fn(),
      onSaveNote: vi.fn(),
      onCreateNote: vi.fn(),
      onSelectNote: vi.fn(),
      onCloseNote: vi.fn(),
      onImportFiles,
    });

    const importButton = view.element.querySelector<HTMLButtonElement>(
      '[aria-label="Importar documento para esta coleção"]'
    );
    const fileInput = view.element.querySelector<HTMLInputElement>('#chain-file-input');
    expect(importButton).not.toBeNull();
    expect(fileInput).not.toBeNull();
    expect(fileInput?.multiple).toBe(true);

    const inputClick = vi.spyOn(fileInput!, 'click');
    importButton?.click();
    expect(inputClick).toHaveBeenCalled();

    const file = new File(['Conteúdo'], 'notas.txt');
    const second = new File(['Outro'], 'outro.txt');
    Object.defineProperty(fileInput!, 'files', {
      value: [file, second],
      configurable: true,
    });
    fileInput!.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onImportFiles).toHaveBeenCalledWith([file, second]);
    onImportFiles.mockClear();

    const enter = new Event('dragenter', { bubbles: true, cancelable: true }) as DragEvent;
    Object.defineProperty(enter, 'dataTransfer', {
      value: { types: ['Files'], files: [file], dropEffect: 'none' },
    });
    view.element.dispatchEvent(enter);

    expect(view.element.classList.contains('chain-document--drop-target')).toBe(true);
    expect(
      view.element.querySelector<HTMLElement>('#chain-drop-overlay')?.hidden
    ).toBe(false);

    const event = dropEvent([file]);
    view.element.dispatchEvent(event);

    expect(onImportFiles).toHaveBeenCalledWith([file]);
    expect(event.defaultPrevented).toBe(true);
    expect(
      view.element.querySelector<HTMLElement>('#chain-drop-overlay')?.hidden
    ).toBe(true);
  });
});
