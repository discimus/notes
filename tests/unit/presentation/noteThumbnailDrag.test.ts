import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AttachmentDTO, NoteDTO } from '@application/dto/index.js';
import type { ChainTab } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import { mountChainDocument } from '@presentation/components/ChainDocument.js';

function attachment(index: number): AttachmentDTO {
  return {
    id: `image-${index}`,
    noteId: 'note-1',
    chainId: 'chain-1',
    kind: 'image',
    fileName: `imagem-${index}.png`,
    mimeType: 'image/png',
    byteSize: 4,
    altText: `Imagem ${index}`,
    createdAt: '2026-01-02T10:00:00.000Z',
  };
}

function makeTab(images: AttachmentDTO[]): ChainTab {
  const note: NoteDTO = {
    id: 'note-1',
    content: 'Nota com imagens',
    chainId: 'chain-1',
    position: 1,
    role: 'tail',
    createdAt: '2026-01-02T10:00:00.000Z',
    updatedAt: '2026-01-02T10:00:00.000Z',
    attachments: images,
  };
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
  };
}

const handlers = {
  onNoteInput: vi.fn(),
  onSaveNote: vi.fn(),
  onEditNote: vi.fn(),
  onCreateNote: vi.fn(),
  onSelectNote: vi.fn(),
  onCloseNote: vi.fn(),
  onNewDocument: vi.fn(),
};

describe('Arraste nas miniaturas de imagem', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    appState.set({ noteImageLayout: 'thumbnails', chainSummaries: [] });
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('permite clique e arraste horizontal sem o modo coluna', () => {
    const view = mountChainDocument(
      makeTab([1, 2, 3].map(attachment)),
      handlers
    );
    const wrapper = document.createElement('div');
    wrapper.className = 'app-shell--compact';
    wrapper.appendChild(view.element);
    document.body.appendChild(wrapper);

    const grid = view.element.querySelector<HTMLElement>(
      '.chain-note__attachment-grid'
    )!;
    Object.defineProperty(grid, 'clientWidth', {
      value: 300,
      configurable: true,
    });
    Object.defineProperty(grid, 'clientHeight', {
      value: 120,
      configurable: true,
    });
    Object.defineProperty(grid, 'scrollWidth', {
      value: 900,
      configurable: true,
    });
    const scrollTo = vi.fn();
    Object.defineProperty(grid, 'scrollTo', {
      value: scrollTo,
      configurable: true,
    });

    const pointer = (type: string, clientX: number): MouseEvent => {
      const event = new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX,
        clientY: 20,
        button: 0,
      });
      Object.defineProperty(event, 'pointerId', { value: 1 });
      Object.defineProperty(event, 'pointerType', { value: 'mouse' });
      return event;
    };

    grid.dispatchEvent(pointer('pointerdown', 200));
    window.dispatchEvent(pointer('pointermove', 80));

    expect(grid.scrollLeft).toBe(120);
    expect(
      grid.classList.contains('chain-note__carousel--dragging')
    ).toBe(true);

    window.dispatchEvent(pointer('pointerup', 80));
    expect(scrollTo).not.toHaveBeenCalled();
    expect(
      grid.classList.contains('chain-note__carousel--dragging')
    ).toBe(false);

    view.destroy();
  });
});
