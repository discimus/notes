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
    content: '',
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

function makeHandlers() {
  return {
    onNoteInput: vi.fn(),
    onSaveNote: vi.fn(),
    onEditNote: vi.fn(),
    onCreateNote: vi.fn(),
    onSelectNote: vi.fn(),
    onCloseNote: vi.fn(),
    onNewDocument: vi.fn(),
  };
}

describe('Arraste do carrossel em nota apenas com imagens', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    appState.set({ chainSummaries: [] });
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('arrasta livremente e magnetiza para a imagem mais próxima ao soltar', async () => {
    const view = mountChainDocument(
      makeTab([1, 2, 3].map(attachment)),
      makeHandlers()
    );
    document.body.appendChild(view.element);

    const grid = view.element.querySelector<HTMLElement>(
      '.chain-note__attachment-grid'
    )!;
    expect(
      view.element
        .querySelector('.chain-note__body')
        ?.classList.contains('chain-note__body--attachment-only')
    ).toBe(true);

    Object.defineProperty(grid, 'clientWidth', {
      value: 300,
      configurable: true,
    });
    Object.defineProperty(grid, 'clientHeight', {
      value: 200,
      configurable: true,
    });
    Object.defineProperty(grid, 'scrollWidth', {
      value: 900,
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
    window.dispatchEvent(pointer('pointermove', -200));

    expect(grid.scrollLeft).toBe(400);
    expect(
      grid.classList.contains('chain-note__carousel--dragging')
    ).toBe(true);

    window.dispatchEvent(pointer('pointerup', -200));
    await vi.waitFor(() => {
      expect(grid.scrollLeft).toBe(300);
      expect(
        grid.classList.contains('chain-note__carousel--dragging')
      ).toBe(false);
    });

    view.destroy();
  });
});
