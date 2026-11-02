import { beforeEach, describe, expect, it } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import {
  EDITOR_STORAGE_KEY,
  EditorStore,
  deriveEditorTitle,
  isChainNoteTabDirty,
  isEditorTabDirty,
} from '@presentation/state/EditorStore.js';

function makeNote(overrides: Partial<NoteDTO> = {}): NoteDTO {
  return {
    id: 'note-1',
    content: 'Uma nota',
    chainId: 'chain-1',
    position: 0,
    role: 'header',
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
    ...overrides,
  };
}

describe('EditorStore', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('cria rascunho, deriva título e controla o estado dirty', () => {
    const store = new EditorStore();
    const tab = store.ensureTab();

    expect(store.getSnapshot().tabs).toHaveLength(1);
    expect(tab.kind).toBe('draft');
    if (tab.kind !== 'draft') throw new Error('Aba deveria ser rascunho');
    expect(tab.title).toBe('Sem título');

    store.updateDraftContent(tab.id, 'Primeira linha\nConteúdo do documento');
    const updated = store.getTab(tab.id);
    if (!updated || updated.kind !== 'draft') throw new Error('Rascunho não encontrado');

    expect(updated.title).toBe('Primeira linha');
    expect(isEditorTabDirty(updated)).toBe(true);

    store.markDraftSaved(
      tab.id,
      { chainId: 'chain-1', noteId: 'note-1', role: 'header', chainTitle: 'Documento' },
      updated.content
    );

    const saved = store.getTab(tab.id);
    if (!saved || saved.kind !== 'draft') throw new Error('Rascunho não encontrado');
    expect(isEditorTabDirty(saved)).toBe(false);
    expect(saved.target?.chainId).toBe('chain-1');
  });

  it('abre aba de coleção com nota pendente e acrescenta nota', () => {
    const store = new EditorStore();
    const tab = store.openChainTab('chain-1', 'Projeto');

    expect(tab.kind).toBe('chain');
    expect(tab.noteTabs).toHaveLength(1);
    expect(tab.activeNoteTabId).toBe(tab.noteTabs[0]?.id);
    expect(tab.composerCollapsed).toBe(false);

    const noteTab = store.getActiveChainNoteTab(tab.id)!;
    store.updateChainNoteTab(tab.id, noteTab.id, 'Nova nota');

    const dirty = store.getTab(tab.id);
    if (!dirty || dirty.kind !== 'chain') throw new Error('Coleção não encontrada');
    expect(isEditorTabDirty(dirty)).toBe(true);
    expect(isChainNoteTabDirty(dirty.noteTabs[0]!)).toBe(true);

    store.appendNoteToChainTab(
      tab.id,
      makeNote({ id: 'note-2', role: 'tail', position: 1 })
    );
    store.removeChainNoteTab(tab.id, noteTab.id);
    const fresh = store.ensureChainNoteTab(tab.id)!;

    const saved = store.getTab(tab.id);
    if (!saved || saved.kind !== 'chain') throw new Error('Coleção não encontrada');
    expect(isEditorTabDirty(saved)).toBe(false);
    expect(saved.notes).toHaveLength(1);
    expect(saved.noteTabs).toHaveLength(1);
    expect(fresh.content).toBe('');
  });

  it('cria, seleciona e fecha múltiplas notas pendentes', () => {
    const store = new EditorStore();
    const chain = store.openChainTab('chain-1', 'Projeto');
    const first = chain.noteTabs[0]!;
    const second = store.createChainNoteTab(chain.id)!;

    expect(store.getActiveChainNoteTab(chain.id)?.id).toBe(second.id);
    store.selectChainNoteTab(chain.id, first.id);
    expect(store.getActiveChainNoteTab(chain.id)?.id).toBe(first.id);

    store.removeChainNoteTab(chain.id, first.id);
    expect(store.getActiveChainNoteTab(chain.id)?.id).toBe(second.id);
  });

  it('restaura rascunhos e abas de coleção a partir do sessionStorage', () => {
    const store = new EditorStore();
    const draft = store.ensureTab();
    if (draft.kind !== 'draft') throw new Error('Aba deveria ser rascunho');
    store.updateDraftContent(draft.id, 'Rascunho persistido');
    const chain = store.openChainTab('chain-1', 'Projeto');
    const noteTab = store.getActiveChainNoteTab(chain.id)!;
    store.updateChainNoteTab(chain.id, noteTab.id, 'Nota pendente persistida');
    store.setChainComposerCollapsed(chain.id, true);
    store.flush();

    const restored = new EditorStore();
    const snapshot = restored.getSnapshot();

    expect(snapshot.tabs).toHaveLength(2);
    expect(snapshot.tabs[0]?.kind).toBe('draft');
    expect(snapshot.tabs[1]?.kind).toBe('chain');
    expect(snapshot.activeTabId).toBe(chain.id);

    const restoredChain = restored.getTab(chain.id);
    if (!restoredChain || restoredChain.kind !== 'chain') {
      throw new Error('Coleção restaurada não encontrada');
    }
    expect(restoredChain.noteTabs[0]?.content).toBe('Nota pendente persistida');
    expect(restoredChain.activeNoteTabId).toBe(restoredChain.noteTabs[0]?.id);
    expect(restoredChain.composerCollapsed).toBe(true);
    expect(restoredChain.notes).toHaveLength(0);
    expect(restoredChain.status).toBe('idle');
  });

  it('migra abas antigas sem kind para rascunho', () => {
    sessionStorage.setItem(
      EDITOR_STORAGE_KEY,
      JSON.stringify({
        activeTabId: 'legacy-1',
        tabs: [
          {
            id: 'legacy-1',
            title: 'Legado',
            content: 'Conteúdo legado',
            savedContent: '',
            target: null,
          },
        ],
      })
    );

    const store = new EditorStore();
    const tab = store.getActiveTab();
    expect(tab?.kind).toBe('draft');
    if (tab?.kind === 'draft') expect(tab.content).toBe('Conteúdo legado');
  });

  it('migra o composer antigo de uma coleção para uma nota pendente', () => {
    sessionStorage.setItem(
      EDITOR_STORAGE_KEY,
      JSON.stringify({
        activeTabId: 'chain-tab',
        tabs: [
          {
            kind: 'chain',
            id: 'chain-tab',
            chainId: 'chain-1',
            title: 'Projeto',
            composer: 'Composer legado',
            savedComposer: '',
          },
        ],
      })
    );

    const store = new EditorStore();
    const tab = store.getActiveTab();
    expect(tab?.kind).toBe('chain');
    if (tab?.kind !== 'chain') throw new Error('Coleção não restaurada');
    expect(tab.noteTabs).toHaveLength(1);
    expect(tab.noteTabs[0]?.content).toBe('Composer legado');
    expect(tab.noteTabs[0]?.id).toBe(tab.activeNoteTabId);
  });

  it('seleciona a aba vizinha ao fechar e fecha abas de uma coleção', () => {
    const store = new EditorStore();
    const first = store.createDraftTab();
    const second = store.openChainTab('chain-1', 'Projeto');

    store.selectTab(first.id);
    store.closeTab(first.id);

    expect(store.getActiveTab()?.id).toBe(second.id);

    store.closeChainTabs('chain-1');
    expect(store.getSnapshot().tabs).toHaveLength(0);
    expect(store.getActiveTab()).toBeNull();
  });

  it('ignora dados inválidos no sessionStorage', () => {
    sessionStorage.setItem(EDITOR_STORAGE_KEY, '{inválido');

    const store = new EditorStore();
    expect(store.getSnapshot().tabs).toHaveLength(0);
    expect(store.ensureTab().title).toBe('Sem título');
  });

  it('trunca títulos longos derivados do conteúdo', () => {
    const title = deriveEditorTitle('a'.repeat(80));
    expect(title.endsWith('…')).toBe(true);
    expect(title.length).toBeLessThanOrEqual(53);
  });
});
