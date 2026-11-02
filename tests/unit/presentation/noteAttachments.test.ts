import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AttachmentDTO } from '@application/dto/index.js';
import type { ChainTab } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import { AppController } from '@presentation/pages/AppController.js';
import { mountChainDocument } from '@presentation/components/ChainDocument.js';
import { releaseAllAttachmentUrls } from '@presentation/components/attachmentUrls.js';

const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;
const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

function attachment(overrides: Partial<AttachmentDTO>): AttachmentDTO {
  return {
    id: 'attachment-1',
    noteId: 'note-1',
    chainId: 'chain-1',
    kind: 'image',
    fileName: 'print.png',
    mimeType: 'image/png',
    byteSize: 4,
    altText: 'Print do erro',
    createdAt: '2026-01-02T10:00:00.000Z',
    ...overrides,
  };
}

const image = attachment({ id: 'image-1' });
const audio = attachment({
  id: 'audio-1',
  kind: 'audio',
  fileName: 'voz.webm',
  mimeType: 'audio/webm',
  duration: 8.5,
  altText: undefined,
});

function makeTab(): ChainTab {
  return {
    kind: 'chain',
    id: 'tab-chain',
    chainId: 'chain-1',
    title: 'Projeto',
    notes: [
      {
        id: 'note-1',
        content: 'Nota com mídia',
        chainId: 'chain-1',
        position: 1,
        role: 'tail',
        createdAt: '2026-01-02T10:00:00.000Z',
        updatedAt: '2026-01-02T10:00:00.000Z',
        attachments: [image, audio],
      },
    ],
    noteTabs: [{ id: 'note-tab-1', content: '', contentType: 'text' }],
    activeNoteTabId: 'note-tab-1',
    composerCollapsed: true,
    status: 'loaded',
  };
}

function makeHandlers() {
  const recorded = {
    blob: new Blob(['audio'], { type: 'audio/webm' }),
    mimeType: 'audio/webm',
    duration: 2,
  };
  const stop = vi.fn().mockResolvedValue(recorded);
  const controller = {
    elapsed: () => 0,
    stop,
    cancel: vi.fn(),
  };
  const startAudioRecordingFn = vi.fn().mockResolvedValue(controller);
  return {
    onNoteInput: vi.fn(),
    onSaveNote: vi.fn(),
    onEditNote: vi.fn(),
    onAddNoteImages: vi.fn(),
    onSaveNoteAudio: vi.fn().mockResolvedValue(true),
    onDeleteNoteAttachment: vi.fn(),
    startAudioRecordingFn,
    onCreateNote: vi.fn(),
    onSelectNote: vi.fn(),
    onCloseNote: vi.fn(),
    onNewDocument: vi.fn(),
    controller,
  };
}

describe('Anexos na nota', () => {
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
    vi.spyOn(AppController, 'getAttachmentBlob').mockImplementation(async (id) => {
      return new Blob([id], {
        type: id.startsWith('image') ? 'image/png' : 'audio/webm',
      });
    });
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined);
    Object.defineProperty(URL, 'createObjectURL', {
      value: vi.fn((blob: Blob) => `blob:${blob.type}`),
      configurable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: vi.fn(),
      configurable: true,
    });
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        read: vi.fn(async () => [
          {
            types: ['image/png'],
            getType: async () => new Blob(['image'], { type: 'image/png' }),
          },
        ]),
      },
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
    if (originalClipboard) {
      Object.defineProperty(navigator, 'clipboard', originalClipboard);
    } else {
      Reflect.deleteProperty(navigator, 'clipboard');
    }
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('renderiza imagem e áudio e aciona as ações da nota', async () => {
    const handlers = makeHandlers();
    const view = mountChainDocument(makeTab(), handlers);
    document.body.appendChild(view.element);

    await vi.waitFor(() => {
      expect(
        view.element.querySelector<HTMLImageElement>('.chain-attachment__image')?.src
      ).toContain('blob:image/png');
    });

    await vi.waitFor(() => {
      const audioElement = view.element.querySelector<HTMLAudioElement>(
        '.chain-attachment__player'
      );
      expect(audioElement?.src).toContain('blob:audio/webm');
    });
    expect(view.element.querySelector('.chain-attachment__name')?.textContent).toBe(
      'voz.webm'
    );
    const playSpy = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockResolvedValue(undefined);
    const playButton = view.element.querySelector<HTMLButtonElement>(
      '.chain-attachment__play'
    );
    await vi.waitFor(() => {
      expect(playButton?.disabled).toBe(false);
    });
    playButton?.click();
    expect(playSpy).toHaveBeenCalledTimes(1);

    view.element
      .querySelector<HTMLButtonElement>('.chain-attachment--image .chain-attachment__preview')
      ?.click();
    expect(document.querySelector('.attachment-image-dialog img')?.getAttribute('alt')).toBe(
      'Print do erro'
    );
    document.querySelector<HTMLButtonElement>('.attachment-image-dialog .btn-icon')?.click();

    view.element
      .querySelector<HTMLButtonElement>('.chain-attachment--image .chain-attachment__action--delete')
      ?.click();
    expect(handlers.onDeleteNoteAttachment).toHaveBeenCalledWith('note-1', image);

    view.element
      .querySelector<HTMLButtonElement>('.chain-note__attach--image')
      ?.click();
    await vi.waitFor(() => {
      expect(handlers.onAddNoteImages).toHaveBeenCalled();
    });
    expect(handlers.onAddNoteImages.mock.calls[0]?.[0]).toBe('note-1');
    const imageFiles = handlers.onAddNoteImages.mock.calls[0]?.[1] as File[];
    expect(imageFiles[0]?.type).toBe('image/png');

    const audioButton = view.element.querySelector<HTMLButtonElement>(
      '.chain-note__attach--audio'
    );
    audioButton?.click();
    await vi.waitFor(() => {
      expect(handlers.startAudioRecordingFn).toHaveBeenCalledTimes(1);
      expect(
        audioButton?.classList.contains('chain-note__attach--recording')
      ).toBe(true);
    });
    audioButton?.click();
    await vi.waitFor(() => {
      expect(handlers.controller.stop).toHaveBeenCalledTimes(1);
      expect(handlers.onSaveNoteAudio).toHaveBeenCalledWith(
        'note-1',
        expect.objectContaining({ duration: 2 })
      );
    });
  });
});
