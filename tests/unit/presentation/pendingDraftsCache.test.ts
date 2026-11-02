import { beforeEach, describe, expect, it } from 'vitest';
import type {
  ChainTab,
  DraftTab,
  EditorSnapshot,
} from '@presentation/state/EditorStore.js';
import {
  buildPendingSnapshot,
  PendingDraftsCache,
  PENDING_DRAFTS_STORAGE_KEY,
} from '@presentation/state/PendingDraftsCache.js';

function draft(overrides: Partial<DraftTab> = {}): DraftTab {
  return {
    kind: 'draft',
    id: 'draft-1',
    title: 'Rascunho',
    content: 'Conteúdo pendente',
    contentType: 'text',
    savedContent: '',
    savedContentType: 'text',
    target: null,
    ...overrides,
  };
}

function chainTab(overrides: Partial<ChainTab> = {}): ChainTab {
  return {
    kind: 'chain',
    id: 'chain-tab-1',
    chainId: 'chain-1',
    title: 'Projeto',
    notes: [],
    noteTabs: [
      { id: 'note-tab-1', content: 'Nota pendente', contentType: 'text' },
      { id: 'note-tab-2', content: '', contentType: 'text' },
    ],
    activeNoteTabId: 'note-tab-2',
    composerCollapsed: true,
    status: 'loaded',
    ...overrides,
  };
}

describe('PendingDraftsCache', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('mantém apenas rascunhos pendentes e coleções com notas pendentes', () => {
    const snapshot: EditorSnapshot = {
      activeTabId: 'saved-draft',
      tabs: [
        draft(),
        draft({
          id: 'saved-draft',
          content: 'Salvo',
          savedContent: 'Salvo',
          target: { chainId: 'chain-1', noteId: 'note-1', role: 'tail' },
        }),
        draft({ id: 'empty', content: '', savedContent: '' }),
        chainTab(),
        chainTab({
          id: 'saved-chain',
          noteTabs: [{ id: 'empty-note', content: '', contentType: 'text' }],
          activeNoteTabId: 'empty-note',
        }),
      ],
    };

    const pending = buildPendingSnapshot(snapshot)!;

    expect(pending.tabs).toHaveLength(2);
    expect(pending.tabs.map((tab) => tab.id)).toEqual(['draft-1', 'chain-tab-1']);
    expect(pending.activeTabId).toBe('draft-1');

    const chain = pending.tabs[1];
    if (!chain || chain.kind !== 'chain') throw new Error('Coleção não encontrada');
    expect(chain.noteTabs).toHaveLength(1);
    expect(chain.noteTabs[0]?.id).toBe('note-tab-1');
    expect(chain.activeNoteTabId).toBe('note-tab-1');
    expect(chain.notes).toHaveLength(0);
    expect(chain.status).toBe('idle');
  });

  it('retorna null quando não há pendências', () => {
    expect(buildPendingSnapshot({ activeTabId: null, tabs: [] })).toBeNull();
    expect(
      buildPendingSnapshot({
        activeTabId: 'saved',
        tabs: [
          draft({
            id: 'saved',
            content: 'Salvo',
            savedContent: 'Salvo',
            target: { chainId: 'chain-1', noteId: 'note-1', role: 'tail' },
          }),
        ],
      })
    ).toBeNull();
  });

  it('grava versão e limpa o cache', () => {
    const cache = new PendingDraftsCache(localStorage);
    cache.write({ activeTabId: 'draft-1', tabs: [draft()] });

    const raw = localStorage.getItem(PENDING_DRAFTS_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.version).toBe(1);
    expect(parsed.savedAt).toBeTypeOf('string');
    expect(parsed.tabs).toHaveLength(1);
    expect(cache.read()).toBe(raw);

    cache.write({ activeTabId: null, tabs: [] });
    expect(localStorage.getItem(PENDING_DRAFTS_STORAGE_KEY)).toBeNull();

    cache.write({ activeTabId: 'draft-1', tabs: [draft()] });
    cache.clear();
    expect(localStorage.getItem(PENDING_DRAFTS_STORAGE_KEY)).toBeNull();
  });

  it('ignora payload inválido ou versão desconhecida', () => {
    const cache = new PendingDraftsCache(localStorage);

    localStorage.setItem(PENDING_DRAFTS_STORAGE_KEY, '{inválido');
    expect(cache.read()).toBeNull();

    localStorage.setItem(
      PENDING_DRAFTS_STORAGE_KEY,
      JSON.stringify({ version: 99, tabs: [] })
    );
    expect(cache.read()).toBeNull();

    expect(cache.read()).toBeNull();
  });
});
