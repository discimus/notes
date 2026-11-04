import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import type { ChainTab } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import { mountChainDocument } from '@presentation/components/ChainDocument.js';

const { pickImagesWithClipboardFallback } = vi.hoisted(() => ({
  pickImagesWithClipboardFallback: vi.fn(
    (onFiles: (files: File[]) => void) => {
      onFiles([new File(['pixels'], 'foto.png', { type: 'image/png' })]);
      return Promise.resolve();
    }
  ),
}));

vi.mock('@presentation/components/imageAttachmentInput.js', () => ({
  pickImagesWithClipboardFallback,
  openImageFilePicker: vi.fn(),
  readImageDimensions: vi.fn(async () => ({})),
}));

const note: NoteDTO = {
  id: 'note-1',
  content: 'Conteúdo',
  chainId: 'chain-1',
  position: 0,
  role: 'header',
  createdAt: '2026-01-02T10:00:00.000Z',
  updatedAt: '2026-01-02T10:00:00.000Z',
};

function makeTab(overrides: Partial<ChainTab> = {}): ChainTab {
  return {
    kind: 'chain',
    id: 'tab-chain',
    chainId: 'chain-1',
    title: 'Projeto',
    notes: [note],
    noteTabs: [{ id: 'note-tab-1', content: '', contentType: 'text' }],
    activeNoteTabId: 'note-tab-1',
    composerCollapsed: false,
    status: 'loaded',
    ...overrides,
  };
}

function makeHandlers() {
  return {
    onNoteInput: vi.fn(),
    onSaveNote: vi.fn(),
    onEditNote: vi.fn(),
    onAddChainImages: vi.fn(),
    onSaveChainAudio: vi.fn(async () => true),
    onPasteText: vi.fn(),
    onCreateNote: vi.fn(),
    onSelectNote: vi.fn(),
    onCloseNote: vi.fn(),
    onNewDocument: vi.fn(),
  };
}

function mount(handlers = makeHandlers(), tab = makeTab()) {
  const view = mountChainDocument(tab, handlers);
  const image = view.element.querySelector<HTMLButtonElement>('#chain-action-image')!;
  const audio = view.element.querySelector<HTMLButtonElement>('#chain-action-audio')!;
  const paste = view.element.querySelector<HTMLButtonElement>('#chain-action-link')!;
  return { view, handlers, image, audio, paste };
}

describe('Ações rápidas com preview ou editor abertos', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    pickImagesWithClipboardFallback.mockClear();
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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('mantém imagem, áudio e colar disponíveis com o editor aberto', () => {
    const { handlers, image, audio, paste } = mount();

    expect(image.disabled).toBe(false);
    expect(audio.disabled).toBe(false);
    expect(paste.disabled).toBe(false);

    image.click();
    expect(pickImagesWithClipboardFallback).toHaveBeenCalledTimes(1);
    expect(handlers.onAddChainImages).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'foto.png', type: 'image/png' }),
    ]);

    paste.click();
    expect(handlers.onPasteText).toHaveBeenCalledTimes(1);
  });

  it('mantém imagem, áudio e colar disponíveis com o preview aberto', () => {
    const { view, handlers, image, audio, paste } = mount();

    view.previewNote('note-1');
    expect(view.element.classList.contains('chain-document--preview-open')).toBe(true);

    expect(image.disabled).toBe(false);
    expect(audio.disabled).toBe(false);
    expect(paste.disabled).toBe(false);

    image.click();
    expect(handlers.onAddChainImages).toHaveBeenCalledTimes(1);

    paste.click();
    expect(handlers.onPasteText).toHaveBeenCalledTimes(1);
  });
});
