import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import type { ChainTab } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import { mountChainDocument } from '@presentation/components/ChainDocument.js';

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
    stop: vi.fn().mockResolvedValue({
      blob: new Blob(['audio'], { type: 'audio/webm' }),
      mimeType: 'audio/webm',
      duration: 1,
    }),
    cancel: vi.fn(),
  };
  return {
    onNoteInput: vi.fn(),
    onSaveNote: vi.fn(),
    onEditNote: vi.fn(),
    onSaveNoteAudio: vi.fn().mockResolvedValue(true),
    onSaveChainAudio: vi.fn().mockResolvedValue(true),
    startAudioRecordingFn: vi.fn().mockResolvedValue(controller),
    onCreateNote: vi.fn(),
    onSelectNote: vi.fn(),
    onCloseNote: vi.fn(),
    onNewDocument: vi.fn(),
  };
}

describe('Ações compactas durante gravação', () => {
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
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('expõe o tempo de gravação no botão compacto de áudio', async () => {
    vi.useFakeTimers();
    const view = mountChainDocument(tab, makeHandlers());
    view.element.classList.add('chain-document--actions-compact');

    const audio = view.element.querySelector<HTMLButtonElement>(
      '#chain-action-audio'
    )!;
    audio.click();
    await vi.advanceTimersByTimeAsync(0);

    expect(audio.classList.contains('chain-quick-action--recording')).toBe(true);
    expect(
      audio.querySelector<HTMLElement>('.chain-quick-action__label')?.textContent
    ).toBe('00:00');
    expect(
      view.element.querySelector<HTMLButtonElement>('#chain-action-image')?.disabled
    ).toBe(true);

    vi.advanceTimersByTime(1_200);
    expect(
      audio.querySelector<HTMLElement>('.chain-quick-action__label')?.textContent
    ).toBe('00:01');

    view.destroy();
  });
});
