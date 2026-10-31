import { beforeEach, describe, expect, it } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import {
  EDITOR_STORAGE_KEY,
  EditorStore,
  deriveEditorTitle,
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

  it('abre aba de cadeia, controla composer e acrescenta nota', () => {
    const store = new EditorStore();
    const tab = store.openChainTab('chain-1', 'Projeto');

    expect(tab.kind).toBe('chain');
    expect(store.getSnapshot().tabs).toHaveLength(1);

    store.updateComposer(tab.id, 'Nova nota');
    const dirty = store.getTab(tab.id);
    if (!dirty || dirty.kind !== 'chain') throw new Error('Cadeia não encontrada');
    expect(isEditorTabDirty(dirty)).toBe(true);

    store.appendNoteToChainTab(tab.id, makeNote({ id: 'note-2', role: 'tail', position: 1 }));
    store.settleComposerAfterAppend(tab.id, 'Nova nota');

    const saved = store.getTab(tab.id);
    if (!saved || saved.kind !== 'chain') throw new Error('Cadeia não encontrada');
    expect(isEditorTabDirty(saved)).toBe(false);
    expect(saved.notes).toHaveLength(1);
    expect(saved.composer).toBe('');
  });

  it('restaura rascunhos e abas de cadeia a partir do sessionStorage', () => {
    const store = new EditorStore();
    const draft = store.ensureTab();
    if (draft.kind !== 'draft') throw new Error('Aba deveria ser rascunho');
    store.updateDraftContent(draft.id, 'Rascunho persistido');
    const chain = store.openChainTab('chain-1', 'Projeto');
    store.updateComposer(chain.id, 'Composer persistido');
    store.flush();

    const restored = new EditorStore();
    const snapshot = restored.getSnapshot();

    expect(snapshot.tabs).toHaveLength(2);
    expect(snapshot.tabs[0]?.kind).toBe('draft');
    expect(snapshot.tabs[1]?.kind).toBe('chain');
    expect(snapshot.activeTabId).toBe(chain.id);

    const restoredChain = restored.getTab(chain.id);
    if (!restoredChain || restoredChain.kind !== 'chain') {
      throw new Error('Cadeia restaurada não encontrada');
    }
    expect(restoredChain.composer).toBe('Composer persistido');
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

  it('seleciona a aba vizinha ao fechar e fecha abas de uma cadeia', () => {
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
