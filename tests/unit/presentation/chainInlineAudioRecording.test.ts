import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import type { ChainTab } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import { mountChainDocument } from '@presentation/components/ChainDocument.js';

const recorded = {
  blob: new Blob(['audio'], { type: 'audio/webm' }),
  mimeType: 'audio/webm',
  duration: 2,
};

const note: NoteDTO = {
  id: 'note-1',
  content: 'Nota de teste',
  chainId: 'chain-1',
  position: 1,
  role: 'tail',
  createdAt: '2026-01-02T10:00:00.000Z',
  updatedAt: '2026-01-02T10:00:00.000Z',
};

const tab: ChainTab = {
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

function makeHandlers() {
  const controller = {
    elapsed: () => 0,
    stop: vi.fn().mockResolvedValue(recorded),
    cancel: vi.fn(),
  };
  return {
    onNoteInput: vi.fn(),
    onSaveNote: vi.fn(),
    onEditNote: vi.fn(),
    onSaveNoteAudio: vi.fn().mockResolvedValue(true),
    onSaveChainAudio: vi.fn().mockResolvedValue(true),
    onPasteText: vi.fn(),
    startAudioRecordingFn: vi.fn().mockResolvedValue(controller),
    onCreateNote: vi.fn(),
    onSelectNote: vi.fn(),
    onCloseNote: vi.fn(),
    onNewDocument: vi.fn(),
    controller,
  };
}

describe('Gravação de áudio inline', () => {
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

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('inicia e mostra o contador dentro do mesmo botão', async () => {
    vi.useFakeTimers();
    const handlers = makeHandlers();
    const view = mountChainDocument(tab, handlers);
    const audio = view.element.querySelector<HTMLButtonElement>(
      '#chain-action-audio'
    )!;

    audio.click();
    await vi.advanceTimersByTimeAsync(0);

    expect(handlers.startAudioRecordingFn).toHaveBeenCalledTimes(1);
    expect(audio.classList.contains('chain-quick-action--recording')).toBe(true);
    expect(
      audio.querySelector('.chain-quick-action__icon')?.textContent
    ).toBe('stop');
    expect(
      audio.querySelector('.chain-quick-action__label')?.textContent
    ).toBe('00:00');
    expect(audio.disabled).toBe(false);
    expect(
      view.element.querySelector<HTMLButtonElement>('#chain-action-document')
        ?.disabled
    ).toBe(true);
    expect(
      view.element.querySelector<HTMLButtonElement>('#chain-action-image')
        ?.disabled
    ).toBe(true);
    expect(
      view.element.querySelector<HTMLButtonElement>('#chain-action-link')
        ?.disabled
    ).toBe(true);
    expect(
      view.element.querySelector<HTMLButtonElement>('.chain-note__edit')
        ?.disabled
    ).toBe(true);
    expect(
      view.element.querySelector<HTMLButtonElement>('.chain-note__attach--image')
        ?.disabled
    ).toBe(true);
    expect(
      view.element.querySelector<HTMLButtonElement>('.chain-note__attach--audio')
        ?.disabled
    ).toBe(true);
    expect(
      view.element.querySelector<HTMLButtonElement>('.chain-note__more')
        ?.disabled
    ).toBe(true);

    vi.advanceTimersByTime(1_200);
    expect(
      audio.querySelector('.chain-quick-action__label')?.textContent
    ).toBe('00:01');

    view.destroy();
  });

  it('para e salva o áudio da nota pelo mesmo microfone', async () => {
    const handlers = makeHandlers();
    const view = mountChainDocument(tab, handlers);
    const audio = view.element.querySelector<HTMLButtonElement>(
      '.chain-note__attach--audio'
    )!;

    audio.click();
    await vi.waitFor(() => {
      expect(
        audio.classList.contains('chain-note__attach--recording')
      ).toBe(true);
      expect(
        audio.querySelector('.chain-note__audio-timer')?.textContent
      ).toBe('00:00');
    });
    const documentAction = view.element.querySelector<HTMLButtonElement>(
      '#chain-action-document'
    );
    const quickImage = view.element.querySelector<HTMLButtonElement>(
      '#chain-action-image'
    );
    const quickAudio = view.element.querySelector<HTMLButtonElement>(
      '#chain-action-audio'
    );
    const quickLink = view.element.querySelector<HTMLButtonElement>(
      '#chain-action-link'
    );
    expect(audio.disabled).toBe(false);
    expect(documentAction?.disabled).toBe(true);
    expect(quickImage?.disabled).toBe(true);
    expect(quickAudio?.disabled).toBe(true);
    expect(quickLink?.disabled).toBe(true);

    audio.click();
    await vi.waitFor(() => {
      expect(handlers.controller.stop).toHaveBeenCalledTimes(1);
      expect(handlers.onSaveNoteAudio).toHaveBeenCalledWith(
        'note-1',
        recorded
      );
      expect(documentAction?.disabled).toBe(false);
      expect(quickImage?.disabled).toBe(false);
      expect(quickAudio?.disabled).toBe(false);
      expect(quickLink?.disabled).toBe(false);
    });
  });

  it('salva automaticamente ao sair da coleção', async () => {
    const handlers = makeHandlers();
    const view = mountChainDocument(tab, handlers);

    view.element
      .querySelector<HTMLButtonElement>('#chain-action-audio')
      ?.click();
    await vi.waitFor(() => {
      expect(handlers.startAudioRecordingFn).toHaveBeenCalledTimes(1);
    });

    view.destroy();

    await vi.waitFor(() => {
      expect(handlers.controller.stop).toHaveBeenCalledTimes(1);
      expect(handlers.onSaveChainAudio).toHaveBeenCalledWith(recorded);
    });
  });
});
