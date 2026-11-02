import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChainTab } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import { mountChainDocument } from '@presentation/components/ChainDocument.js';

const tab: ChainTab = {
  kind: 'chain',
  id: 'tab-chain',
  chainId: 'chain-1',
  title: 'Projeto novo',
  notes: [],
  noteTabs: [{ id: 'note-tab-1', content: '' }],
  activeNoteTabId: 'note-tab-1',
  composerCollapsed: false,
  status: 'loaded',
};

describe('Empty chain document', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    appState.set({
      chainSummaries: [
        {
          id: 'chain-1',
          displayTitle: 'Projeto novo',
          noteCount: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          tagIds: [],
          tags: [],
          headerExcerpt: '',
        },
      ],
    });
  });

  it('renderiza coleção com zero notas e compositor pronto', () => {
    const view = mountChainDocument(tab, {
      onNoteInput: vi.fn(),
      onSaveNote: vi.fn(),
      onCreateNote: vi.fn(),
      onSelectNote: vi.fn(),
      onCloseNote: vi.fn(),
    });

    expect(view.element.querySelector('#chain-note-count')?.textContent).toBe('0 notas');
    expect(view.element.textContent).toContain('Nenhuma nota ainda');
    expect(view.element.querySelector('#chain-composer-input')).not.toBeNull();
  });
});
