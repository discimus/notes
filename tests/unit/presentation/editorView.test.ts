import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChainSummaryDTO, NoteDTO } from '@application/dto/index.js';
import { EditorStore } from '@presentation/state/EditorStore.js';
import { mountEditorView } from '@presentation/views/editor.js';
import { AppController } from '@presentation/pages/AppController.js';
import { appState } from '@presentation/state/AppState.js';

let cleanup: (() => void) | null = null;

function makeChain(overrides: Partial<ChainSummaryDTO> = {}): ChainSummaryDTO {
  return {
    id: 'chain-1',
    displayTitle: 'Projeto principal',
    noteCount: 2,
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-02T10:00:00.000Z',
    isFavorite: false,
    tagIds: [],
    tags: [],
    headerExcerpt: 'Primeira nota',
    ...overrides,
  };
}

function makeNote(overrides: Partial<NoteDTO> = {}): NoteDTO {
  return {
    id: 'note-2',
    content: 'Nova nota',
    chainId: 'chain-1',
    position: 1,
    role: 'tail',
    createdAt: '2026-01-02T11:00:00.000Z',
    updatedAt: '2026-01-02T11:00:00.000Z',
    ...overrides,
  };
}

describe('EditorView', () => {
  beforeEach(() => {
    sessionStorage.clear();
    document.body.innerHTML = '<div id="editor-host"></div>';
    appState.set({
      view: 'editor',
      chainSummaries: [makeChain()],
      chainFilterQuery: '',
      isLoading: false,
    });
    vi.spyOn(AppController, 'loadEditorChainTab').mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup?.();
    cleanup = null;
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  function mount(store: EditorStore): HTMLElement {
    const host = document.getElementById('editor-host') as HTMLElement;
    cleanup = mountEditorView(host, store);
    return host;
  }

  it('monta workspace com lateral, aba inicial e editor', () => {
    const store = new EditorStore();
    const host = mount(store);

    expect(host.querySelector('#editor-sidebar')).not.toBeNull();
    expect(host.querySelector('[role="tablist"]')).not.toBeNull();
    expect(host.querySelectorAll('[role="tab"]')).toHaveLength(1);
    expect(host.querySelector('#editor-panel')?.getAttribute('role')).toBe('tabpanel');
    expect(host.querySelector<HTMLTextAreaElement>('#draft-textarea')?.value).toBe('');
    expect(host.querySelector('#draft-target-text')?.textContent).toBe('Novo documento');
  });

  it('atualiza título derivado, dirty state e estatísticas ao digitar', () => {
    const store = new EditorStore();
    const host = mount(store);
    const textarea = host.querySelector<HTMLTextAreaElement>('#draft-textarea');
    if (!textarea) throw new Error('Textarea não encontrada');

    textarea.value = 'Primeira linha\nSegunda linha';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));

    const active = store.getActiveTab();
    expect(active?.kind).toBe('draft');
    if (active?.kind === 'draft') {
      expect(active.title).toBe('Primeira linha');
      expect(active.content).toBe('Primeira linha\nSegunda linha');
    }
    expect(host.querySelector('.editor-tab__label')?.textContent).toBe('Primeira linha');
    expect(host.querySelector('#draft-save-state')?.textContent).toBe(
      'Alterações não salvas'
    );
    expect(host.querySelector('#draft-stats')?.textContent).toContain('caracteres');
  });

  it('cria novas abas e restaura o conteúdo ao trocar de aba', () => {
    const store = new EditorStore();
    const host = mount(store);
    const textarea = host.querySelector<HTMLTextAreaElement>('#draft-textarea');
    if (!textarea) throw new Error('Textarea não encontrada');

    textarea.value = 'Documento um';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));

    host.querySelector<HTMLButtonElement>('#editor-new-tab')?.click();
    expect(store.getSnapshot().tabs).toHaveLength(2);
    expect(host.querySelector<HTMLTextAreaElement>('#draft-textarea')?.value).toBe('');

    const secondTextarea = host.querySelector<HTMLTextAreaElement>('#draft-textarea');
    if (!secondTextarea) throw new Error('Segunda textarea não encontrada');
    secondTextarea.value = 'Documento dois';
    secondTextarea.dispatchEvent(new Event('input', { bubbles: true }));

    const firstTabId = store.getSnapshot().tabs[0]!.id;
    document.getElementById(`editor-tab-${firstTabId}`)?.click();

    expect(host.querySelector<HTMLTextAreaElement>('#draft-textarea')?.value).toBe(
      'Documento um'
    );
  });

  it('recolhe o rodapé de notas e amplia a leitura da cadeia', () => {
    const store = new EditorStore();
    const host = mount(store);
    const chain = store.openChainTab('chain-1', 'Projeto principal');

    host.querySelector<HTMLButtonElement>('#chain-composer-toggle')?.click();

    const collapsed = store.getTab(chain.id);
    expect(
      collapsed?.kind === 'chain' && collapsed.composerCollapsed
    ).toBe(true);
    expect(
      host.querySelector('.chain-document')?.classList.contains(
        'chain-document--notes-collapsed'
      )
    ).toBe(true);
    expect(
      host.querySelector<HTMLElement>('#chain-composer-body')?.hidden
    ).toBe(true);

    host.querySelector<HTMLButtonElement>('#chain-composer-toggle')?.click();
    const expanded = store.getTab(chain.id);
    expect(
      expanded?.kind === 'chain' && expanded.composerCollapsed
    ).toBe(false);
  });

  it('pede uma cadeia no primeiro salvamento e vincula o rascunho', async () => {
    const store = new EditorStore();
    const host = mount(store);
    const textarea = host.querySelector<HTMLTextAreaElement>('#draft-textarea');
    if (!textarea) throw new Error('Textarea não encontrada');

    textarea.value = 'Minha nota';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));

    const note = makeNote();
    const save = vi.spyOn(AppController, 'saveEditorToChain').mockResolvedValue({
      ok: true,
      target: {
        chainId: 'chain-1',
        noteId: note.id,
        role: note.role,
        chainTitle: 'Projeto principal',
      },
      chainTitle: 'Projeto principal',
      note,
    });

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true })
    );

    expect(document.querySelector('.append-chain-dialog')).not.toBeNull();
    document.querySelector<HTMLInputElement>('input[value="chain-1"]')?.click();
    document
      .querySelector<HTMLButtonElement>('[id^="append-chain-confirm-"]')
      ?.click();

    await vi.waitFor(() => {
      const active = store.getActiveTab();
      expect(active?.kind === 'draft' && active.target?.chainId).toBe('chain-1');
    });

    expect(save).toHaveBeenCalledWith('chain-1', 'Minha nota');
    expect(host.querySelector('#draft-target-text')?.textContent).toBe(
      'Em “Projeto principal”'
    );
  });

  it('abre cadeia do store e adiciona nota pelo compositor', async () => {
    const store = new EditorStore();
    const host = mount(store);

    const chain = store.openChainTab('chain-1', 'Projeto principal');
    const note = makeNote();
    const append = vi.spyOn(AppController, 'appendToEditorChainTab').mockResolvedValue({
      ok: true,
      note,
      chainTitle: 'Projeto principal',
    });

    const composer = host.querySelector<HTMLTextAreaElement>('#chain-composer-input');
    if (!composer) throw new Error('Compositor não encontrado');
    composer.value = 'Nova nota';
    composer.dispatchEvent(new Event('input', { bubbles: true }));

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true })
    );

    await vi.waitFor(() => {
      const active = store.getTab(chain.id);
      expect(active?.kind === 'chain' && active.notes.length).toBe(1);
    });

    expect(append).toHaveBeenCalledWith('chain-1', 'Nova nota');
    const active = store.getTab(chain.id);
    if (!active || active.kind !== 'chain') throw new Error('Cadeia não encontrada');
    expect(active.noteTabs).toHaveLength(1);
    expect(active.noteTabs[0]?.content).toBe('');
    expect(host.querySelector<HTMLTextAreaElement>('#chain-composer-input')?.value).toBe('');
  });

  it('salva todas as notas pendentes ao fechar a aba da cadeia', async () => {
    const store = new EditorStore();
    const host = mount(store);
    const chain = store.openChainTab('chain-1', 'Projeto principal');

    const firstComposer = host.querySelector<HTMLTextAreaElement>(
      '#chain-composer-input'
    );
    if (!firstComposer) throw new Error('Compositor não encontrado');
    firstComposer.value = 'Nota A';
    firstComposer.dispatchEvent(new Event('input', { bubbles: true }));

    host.querySelector<HTMLButtonElement>('#chain-note-new')?.click();
    const secondComposer = host.querySelector<HTMLTextAreaElement>(
      '#chain-composer-input'
    );
    if (!secondComposer) throw new Error('Compositor não encontrado');
    secondComposer.value = 'Nota B';
    secondComposer.dispatchEvent(new Event('input', { bubbles: true }));

    const append = vi
      .spyOn(AppController, 'appendToEditorChainTab')
      .mockResolvedValueOnce({
        ok: true,
        note: makeNote({ id: 'note-a', content: 'Nota A' }),
        chainTitle: 'Projeto principal',
      })
      .mockResolvedValueOnce({
        ok: true,
        note: makeNote({ id: 'note-b', content: 'Nota B' }),
        chainTitle: 'Projeto principal',
      });

    document
      .querySelector<HTMLButtonElement>(
        `[data-tab-id="${chain.id}"] .editor-tab__close`
      )
      ?.click();
    document.querySelector<HTMLButtonElement>('[id^="close-tab-save-"]')?.click();

    await vi.waitFor(() => {
      expect(append).toHaveBeenCalledTimes(2);
      expect(store.getSnapshot().tabs.some((tab) => tab.id === chain.id)).toBe(false);
    });

    expect(append.mock.calls.map(([chainId, content]) => [chainId, content])).toEqual([
      ['chain-1', 'Nota A'],
      ['chain-1', 'Nota B'],
    ]);
  });

  it('protege o fechamento de uma aba com alterações não salvas', async () => {
    const store = new EditorStore();
    const host = mount(store);
    const textarea = host.querySelector<HTMLTextAreaElement>('#draft-textarea');
    if (!textarea) throw new Error('Textarea não encontrada');

    textarea.value = 'Rascunho';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));

    host.querySelector<HTMLButtonElement>('.editor-tab__close')?.click();
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();

    document.querySelector<HTMLButtonElement>('[id^="close-tab-discard-"]')?.click();

    await vi.waitFor(() => {
      expect(store.getSnapshot().tabs).toHaveLength(0);
    });
    expect(host.querySelector('#editor-panel')?.textContent).toContain(
      'Nenhum documento aberto'
    );
  });
});
