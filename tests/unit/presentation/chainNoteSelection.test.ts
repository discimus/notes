import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import type { ChainTab } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import { mountChainDocument } from '@presentation/components/ChainDocument.js';

function makeNote(overrides: Partial<NoteDTO> = {}): NoteDTO {
  return {
    id: 'note-1',
    content: 'Primeira nota',
    chainId: 'chain-1',
    position: 0,
    role: 'header',
    createdAt: '2026-01-02T10:00:00.000Z',
    updatedAt: '2026-01-02T10:00:00.000Z',
    ...overrides,
  };
}

const first = makeNote();
const second = makeNote({
  id: 'note-2',
  content: 'Segunda nota',
  position: 1,
  role: 'tail',
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
    noteTabs: [],
    activeNoteTabId: null,
    composerCollapsed: true,
    status: 'loaded',
    ...overrides,
  };
}

function makeHandlers() {
  return {
    initialEditorMode: 'none' as const,
    onNoteInput: vi.fn(),
    onSaveNote: vi.fn(),
    onEditNote: vi.fn(),
    onCreateNote: vi.fn(),
    onSelectNote: vi.fn(),
    onCloseNote: vi.fn(),
    onNewDocument: vi.fn(),
  };
}

describe('Seleção de notas da coleção', () => {
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
      allTags: [],
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  function mount() {
    const view = mountChainDocument(makeTab(), makeHandlers());
    const toggle = view.element.querySelector<HTMLButtonElement>(
      '#chain-note-select-toggle'
    )!;
    const summary = view.element.querySelector<HTMLElement>(
      '#chain-selection-summary'
    )!;
    const selectAll = view.element.querySelector<HTMLInputElement>(
      '#chain-select-all'
    )!;
    const count = view.element.querySelector<HTMLElement>(
      '#chain-selection-count'
    )!;
    return { view, toggle, summary, selectAll, count };
  }

  it('ativa o modo de seleção com a opção Todas', () => {
    const { view, toggle, summary, count } = mount();

    expect(view.element.classList.contains('chain-document--selection')).toBe(
      false
    );
    expect(summary.hidden).toBe(true);

    toggle.click();

    expect(view.element.classList.contains('chain-document--selection')).toBe(
      true
    );
    expect(summary.hidden).toBe(false);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(toggle.getAttribute('aria-label')).toBe('Cancelar seleção');
    expect(count.textContent).toBe('0 de 2 selecionadas');
    expect(
      view.element.querySelectorAll<HTMLInputElement>('[data-note-select]')
    ).toHaveLength(2);
    expect(
      view.element.querySelector<HTMLButtonElement>('#chain-import-file')?.hidden
    ).toBe(false);
  });

  it('oculta importar enquanto houver notas marcadas', () => {
    const { view } = mount();
    const importButton = view.element.querySelector<HTMLButtonElement>(
      '#chain-import-file'
    )!;
    view.element
      .querySelector<HTMLButtonElement>('#chain-note-select-toggle')
      ?.click();

    const firstInput = view.element.querySelector<HTMLInputElement>(
      '[data-note-select="note-1"]'
    )!;

    firstInput.click();
    expect(importButton.hidden).toBe(true);
    expect(importButton.style.display).toBe('none');

    firstInput.click();
    expect(importButton.hidden).toBe(false);
    expect(importButton.style.display).toBe('');
  });

  it('marca notas, atualiza o estado parcial e seleciona todas', () => {
    const { view, selectAll, count } = mount();
    view.element
      .querySelector<HTMLButtonElement>('#chain-note-select-toggle')
      ?.click();

    const firstInput = view.element.querySelector<HTMLInputElement>(
      '[data-note-select="note-1"]'
    )!;
    const secondInput = view.element.querySelector<HTMLInputElement>(
      '[data-note-select="note-2"]'
    )!;

    firstInput.click();

    expect(firstInput.checked).toBe(true);
    expect(count.textContent).toBe('1 de 2 selecionada');
    expect(selectAll.indeterminate).toBe(true);
    expect(
      view.element
        .querySelector('[data-note-id="note-1"]')
        ?.classList.contains('chain-note--marked')
    ).toBe(true);

    selectAll.click();

    expect(firstInput.checked).toBe(true);
    expect(secondInput.checked).toBe(true);
    expect(selectAll.checked).toBe(true);
    expect(selectAll.indeterminate).toBe(false);
    expect(count.textContent).toBe('2 de 2 selecionadas');

    selectAll.click();

    expect(firstInput.checked).toBe(false);
    expect(secondInput.checked).toBe(false);
    expect(count.textContent).toBe('0 de 2 selecionadas');
  });

  it('cancela a seleção com Escape', () => {
    const { view, toggle, summary, selectAll } = mount();
    toggle.click();
    view.element
      .querySelector<HTMLInputElement>('[data-note-select="note-1"]')
      ?.click();

    view.element.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      })
    );

    expect(summary.hidden).toBe(true);
    expect(view.element.classList.contains('chain-document--selection')).toBe(
      false
    );
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(selectAll.checked).toBe(false);
    expect(
      view.element
        .querySelector('[data-note-id="note-1"]')
        ?.classList.contains('chain-note--marked')
    ).toBe(false);
  });
});
