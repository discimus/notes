import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChainTab } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import { mountChainDocument } from '@presentation/components/ChainDocument.js';

const tab: ChainTab = {
  kind: 'chain',
  id: 'tab-chain',
  chainId: 'chain-1',
  title: 'Projeto',
  notes: [],
  noteTabs: [{ id: 'note-tab-1', content: '', contentType: 'text' }],
  activeNoteTabId: 'note-tab-1',
  composerCollapsed: true,
  status: 'idle',
};

describe('Ícones das quick actions', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    appState.set({
      chainSummaries: [
        {
          id: 'chain-1',
          displayTitle: 'Projeto',
          noteCount: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
          tagIds: [],
          tags: [],
          headerExcerpt: '',
        },
      ],
    });
  });

  it('usa a nova família de ícones nas quatro ações', () => {
    const view = mountChainDocument(tab, {
      onNoteInput: vi.fn(),
      onSaveNote: vi.fn(),
      onCreateNote: vi.fn(),
      onSelectNote: vi.fn(),
      onCloseNote: vi.fn(),
      onNewDocument: vi.fn(),
      onPasteText: vi.fn(),
    });

    const icons = [
      ...view.element.querySelectorAll('.chain-quick-action__icon'),
    ].map((icon) => icon.textContent);

    expect(icons).toEqual([
      'note_add',
      'content_paste_go',
      'add_photo_alternate',
      'mic',
    ]);
  });
});
