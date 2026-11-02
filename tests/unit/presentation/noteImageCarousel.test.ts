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

describe('Carrossel de imagens na largura da nota', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    appState.set({ noteImageLayout: 'column', chainSummaries: [] });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    appState.set({ noteImageLayout: 'thumbnails' });
  });

  it('mostra uma imagem por vez com controles acessíveis', () => {
    const images = [1, 2, 3].map(attachment);
    const view = mountChainDocument(makeTab(images), makeHandlers());
    const wrapper = document.createElement('div');
    wrapper.className = 'app-shell--image-column';
    wrapper.appendChild(view.element);
    document.body.appendChild(wrapper);

    const grid = view.element.querySelector<HTMLElement>(
      '.chain-note__attachment-grid'
    )!;
    const slides = view.element.querySelectorAll('.chain-attachment--image');
    const controls = view.element.querySelector<HTMLElement>(
      '.chain-note__carousel-controls'
    );
    const dots = view.element.querySelectorAll<HTMLButtonElement>(
      '.chain-note__carousel-dot'
    );
    const next = view.element.querySelector<HTMLButtonElement>(
      '.chain-note__carousel-nav[aria-label="Próxima imagem"]'
    )!;

    expect(slides).toHaveLength(3);
    expect(controls).not.toBeNull();
    expect(dots).toHaveLength(3);
    expect(slides[1]?.getAttribute('aria-label')).toBe('Imagem 2 de 3');
    expect(grid.getAttribute('aria-roledescription')).toBe('carrossel');
    expect(dots[0]?.getAttribute('aria-current')).toBe('true');

    Object.defineProperty(grid, 'clientWidth', {
      value: 300,
      configurable: true,
    });
    Object.defineProperty(grid, 'scrollTo', {
      value: vi.fn(),
      configurable: true,
    });

    next.click();
    expect(grid.scrollTo).toHaveBeenCalledWith({
      left: 300,
      behavior: 'smooth',
    });
    expect(dots[1]?.getAttribute('aria-current')).toBe('true');
    expect(dots[0]?.hasAttribute('aria-current')).toBe(false);

    grid.scrollLeft = 600;
    grid.dispatchEvent(new Event('scroll'));
    expect(dots[2]?.getAttribute('aria-current')).toBe('true');
    expect(next.disabled).toBe(true);

    view.destroy();
  });

  it('permite arrastar horizontalmente com o mouse', () => {
    const images = [1, 2, 3].map(attachment);
    const view = mountChainDocument(makeTab(images), makeHandlers());
    const wrapper = document.createElement('div');
    wrapper.className = 'app-shell--image-column';
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
      value: 200,
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
    window.dispatchEvent(pointer('pointermove', -200));

    expect(grid.scrollLeft).toBe(400);
    expect(
      grid.classList.contains('chain-note__carousel--dragging')
    ).toBe(true);

    window.dispatchEvent(pointer('pointerup', -200));
    expect(scrollTo).toHaveBeenCalledWith({
      left: 300,
      behavior: 'smooth',
    });
    expect(
      grid.classList.contains('chain-note__carousel--dragging')
    ).toBe(false);

    view.destroy();
  });

  it('não cria controles quando há apenas uma imagem', () => {
    const view = mountChainDocument(
      makeTab([attachment(1)]),
      makeHandlers()
    );

    expect(
      view.element.querySelector('.chain-note__carousel-controls')
    ).toBeNull();

    view.destroy();
  });
});
