import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import type { ChainTab } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import { mountChainDocument } from '@presentation/components/ChainDocument.js';

const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

function note(overrides: Partial<NoteDTO> = {}): NoteDTO {
  return {
    id: 'note-1',
    content: 'Primeira nota',
    chainId: 'chain-1',
    position: 1,
    role: 'tail',
    createdAt: '2026-01-02T10:00:00.000Z',
    updatedAt: '2026-01-02T10:00:00.000Z',
    ...overrides,
  };
}

const first = note();
const second = note({
  id: 'note-2',
  content: 'Segunda nota',
  position: 2,
  createdAt: '2026-01-02T11:00:00.000Z',
  updatedAt: '2026-01-02T11:00:00.000Z',
});

function makeTab(overrides: Partial<ChainTab> = {}): ChainTab {
  return {
    kind: 'chain',
    id: 'tab-chain',
    chainId: 'chain-1',
    title: 'Projeto',
    notes: [first, second],
    noteTabs: [{ id: 'note-tab-1', content: '', contentType: 'text' }],
    activeNoteTabId: 'note-tab-1',
    composerCollapsed: true,
    status: 'loaded',
    ...overrides,
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
    onAddChainImages: vi.fn(),
    onSaveChainAudio: vi.fn().mockResolvedValue(true),
    startAudioRecordingFn,
    onCreateNote: vi.fn(),
    onSelectNote: vi.fn(),
    onCloseNote: vi.fn(),
    onNewDocument: vi.fn(),
    controller,
  };
}

describe('Quick actions de mídia', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    appState.set({
      chainSummaries: [
        {
          id: 'chain-1',
          displayTitle: 'Projeto',
          noteCount: 2,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
          tagIds: [],
          tags: [],
          headerExcerpt: '',
        },
      ],
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
    if (originalClipboard) {
      Object.defineProperty(navigator, 'clipboard', originalClipboard);
    } else {
      Reflect.deleteProperty(navigator, 'clipboard');
    }
    document.body.innerHTML = '';
  });

  it('habilita imagem e áudio e envia a mídia para o final da coleção', async () => {
    const handlers = makeHandlers();
    const view = mountChainDocument(makeTab(), handlers);
    const image = view.element.querySelector<HTMLButtonElement>('#chain-action-image');
    const audio = view.element.querySelector<HTMLButtonElement>('#chain-action-audio');

    expect(image?.disabled).toBe(false);
    expect(audio?.disabled).toBe(false);
    expect(image?.getAttribute('aria-label')).toBe(
      'Adicionar imagem ao final da coleção'
    );
    expect(audio?.getAttribute('aria-label')).toBe(
      'Gravar áudio para o final da coleção'
    );

    audio?.click();
    await vi.waitFor(() => {
      expect(handlers.startAudioRecordingFn).toHaveBeenCalledTimes(1);
      expect(
        audio?.classList.contains('chain-quick-action--recording')
      ).toBe(true);
    });
    audio?.click();
    await vi.waitFor(() => {
      expect(handlers.controller.stop).toHaveBeenCalledTimes(1);
      expect(handlers.onSaveChainAudio).toHaveBeenCalledTimes(1);
    });
    expect(handlers.onSaveNoteAudio).not.toHaveBeenCalled();

    image?.click();
    await vi.waitFor(() => {
      expect(handlers.onAddChainImages).toHaveBeenCalledWith(expect.any(Array));
    });
    expect(handlers.onAddNoteImages).not.toHaveBeenCalled();
  });

  it('não usa a aba de edição ativa como destino global', async () => {
    const handlers = makeHandlers();
    const view = mountChainDocument(
      makeTab({
        noteTabs: [
          {
            id: 'note-tab-1',
            content: 'Primeira nota',
            contentType: 'text',
            editingNoteId: 'note-1',
            baseContent: 'Primeira nota',
            baseContentType: 'text',
          },
        ],
      }),
      handlers
    );

    const audio = view.element.querySelector<HTMLButtonElement>(
      '#chain-action-audio'
    );
    audio?.click();
    await vi.waitFor(() => {
      expect(handlers.startAudioRecordingFn).toHaveBeenCalledTimes(1);
      expect(
        audio?.classList.contains('chain-quick-action--recording')
      ).toBe(true);
    });
    audio?.click();
    await vi.waitFor(() => {
      expect(handlers.onSaveChainAudio).toHaveBeenCalledTimes(1);
      expect(
        view.element.querySelector<HTMLButtonElement>('#chain-action-image')
          ?.disabled
      ).toBe(false);
    });
    view.element.querySelector<HTMLButtonElement>('#chain-action-image')?.click();

    await vi.waitFor(() => {
      expect(handlers.onAddChainImages).toHaveBeenCalledWith(expect.any(Array));
    });
    expect(handlers.onSaveNoteAudio).not.toHaveBeenCalled();
    expect(handlers.onAddNoteImages).not.toHaveBeenCalled();
  });
});
