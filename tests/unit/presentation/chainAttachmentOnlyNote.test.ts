import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AttachmentDTO } from '@application/dto/index.js';
import type { ChainTab } from '@presentation/state/EditorStore.js';
import { AppController } from '@presentation/pages/AppController.js';
import { mountChainDocument } from '@presentation/components/ChainDocument.js';
import { releaseAllAttachmentUrls } from '@presentation/components/attachmentUrls.js';

const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

function image(id: string): AttachmentDTO {
  return {
    id,
    noteId: 'note-1',
    chainId: 'chain-1',
    kind: 'image',
    fileName: `${id}.png`,
    mimeType: 'image/png',
    byteSize: 4,
    altText: id,
    createdAt: '2026-01-02T10:00:00.000Z',
  };
}

function makeTab(): ChainTab {
  return {
    kind: 'chain',
    id: 'tab-chain',
    chainId: 'chain-1',
    title: 'Projeto',
    notes: [
      {
        id: 'note-1',
        content: '',
        chainId: 'chain-1',
        position: 1,
        role: 'tail',
        createdAt: '2026-01-02T10:00:00.000Z',
        updatedAt: '2026-01-02T10:00:00.000Z',
        attachments: [image('image-1'), image('image-2')],
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
    onCreateNote: vi.fn(),
    onSelectNote: vi.fn(),
    onCloseNote: vi.fn(),
    onNewDocument: vi.fn(),
  };
}

describe('Notas sem texto', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.spyOn(AppController, 'getAttachmentBlob').mockImplementation(async (id) => {
      return new Blob([id], { type: 'image/png' });
    });
    Object.defineProperty(URL, 'createObjectURL', {
      value: vi.fn((blob: Blob) => `blob:${blob.type}`),
      configurable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: vi.fn(),
      configurable: true,
    });
  });

  afterEach(() => {
    releaseAllAttachmentUrls();
    Object.defineProperty(URL, 'createObjectURL', {
      value: originalCreateObjectURL,
      configurable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: originalRevokeObjectURL,
      configurable: true,
    });
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('renderiza as imagens no carrossel sem parágrafo de texto', async () => {
    const view = mountChainDocument(makeTab(), makeHandlers());
    document.body.appendChild(view.element);

    const note = view.element.querySelector<HTMLElement>('.chain-note');
    if (!note) throw new Error('Nota não encontrada');

    expect(note.querySelector('.chain-note__text')).toBeNull();
    expect(
      note.querySelector('.chain-note__body')?.classList.contains(
        'chain-note__body--attachment-only'
      )
    ).toBe(true);
    expect(note.querySelectorAll('.chain-attachment--image')).toHaveLength(2);
    expect(note.querySelector('.chain-note__carousel-controls')).not.toBeNull();

    await vi.waitFor(() => {
      expect(
        note.querySelector<HTMLImageElement>('.chain-attachment__image')?.src
      ).toContain('blob:image/png');
    });
  });
});
