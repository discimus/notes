import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AttachmentDTO } from '@application/dto/index.js';
import type { ChainTab } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import { AppController } from '@presentation/pages/AppController.js';
import { mountChainDocument } from '@presentation/components/ChainDocument.js';
import { releaseAllAttachmentUrls } from '@presentation/components/attachmentUrls.js';

function image(index: number): AttachmentDTO {
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

function makeTab(attachments: AttachmentDTO[]): ChainTab {
  return {
    kind: 'chain',
    id: 'tab-chain',
    chainId: 'chain-1',
    title: 'Projeto',
    notes: [
      {
        id: 'note-1',
        content: 'Nota com imagens',
        chainId: 'chain-1',
        position: 1,
        role: 'tail',
        createdAt: '2026-01-02T10:00:00.000Z',
        updatedAt: '2026-01-02T10:00:00.000Z',
        attachments,
      },
    ],
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
    onDeleteNoteAttachment: vi.fn(),
    onCreateNote: vi.fn(),
    onSelectNote: vi.fn(),
    onCloseNote: vi.fn(),
  };
}

describe('Limite visual de imagens da nota', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    appState.set({ chainSummaries: [] });
    vi.spyOn(AppController, 'getAttachmentBlob').mockResolvedValue(null);
  });

  afterEach(() => {
    releaseAllAttachmentUrls();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('mantém as imagens no DOM e sinaliza as excedentes', () => {
    const view = mountChainDocument(
      makeTab([image(1), image(2), image(3), image(4)]),
      makeHandlers()
    );

    const items = [
      ...view.element.querySelectorAll<HTMLElement>(
        '.chain-note__attachment-grid .chain-attachment--image'
      ),
    ];
    expect(items).toHaveLength(4);
    expect(
      items.slice(0, 3).every((item) => !item.classList.contains('chain-attachment--preview-hidden'))
    ).toBe(true);
    expect(items[3]?.classList.contains('chain-attachment--preview-hidden')).toBe(
      true
    );

    const group = view.element.querySelector('.chain-note__attachment-images');
    const more = group?.querySelector('.chain-note__attachment-more');

    expect(group).not.toBeNull();
    expect(group?.getAttribute('role')).toBe('group');
    expect(group?.getAttribute('aria-label')).toBe('Imagens da nota');
    expect(group?.querySelector('.chain-note__attachment-grid')).not.toBeNull();
    expect(more?.textContent).toContain('+1');
    expect(more?.textContent).toContain('1 imagem adicional');

    view.destroy();
  });

  it('não cria indicador quando todas as imagens cabem no preview', () => {
    const view = mountChainDocument(
      makeTab([image(1), image(2), image(3)]),
      makeHandlers()
    );

    expect(view.element.querySelector('.chain-note__attachment-more')).toBeNull();
    expect(
      view.element.querySelectorAll('.chain-attachment--preview-hidden')
    ).toHaveLength(0);
    view.destroy();
  });
});
