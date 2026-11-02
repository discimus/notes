import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ChainSummaryDTO,
  NoteDTO,
  TagDTO,
  TimelineEntryDTO,
} from '@application/dto/index.js';
import { appState } from '@presentation/state/AppState.js';
import { AppController } from '@presentation/pages/AppController.js';
import {
  renderTimelineLayout,
  updateTimelineLayout,
} from '@presentation/views/timeline.js';

const chain: ChainSummaryDTO = {
  id: 'chain-1',
  displayTitle: 'Projeto',
  noteCount: 2,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  tagIds: [],
  tags: [],
  headerExcerpt: '',
};

function note(id: string): NoteDTO {
  return {
    id,
    chainId: 'chain-1',
    position: 0,
    role: 'tail',
    content: `Conteúdo ${id}`,
    createdAt: '2026-01-02T10:00:00.000Z',
    updatedAt: '2026-01-02T10:00:00.000Z',
  };
}

function entry(id: string): TimelineEntryDTO {
  return {
    note: note(id),
    chainId: 'chain-1',
    chainTitle: 'Projeto',
  };
}

function makeState(overrides: Record<string, unknown> = {}) {
  return {
    ...appState.get(),
    view: 'timeline' as const,
    chainSummaries: [chain],
    allTags: [],
    timelineSelectedChainIds: [],
    timelineEntries: [entry('note-1'), entry('note-2')],
    timelineTotal: 2,
    timelineLoadedOffset: 0,
    timelinePageSize: 50,
    timelinePageIndex: 0,
    timelineFilters: { query: '', from: '', to: '', tagIds: [] },
    timelineIsLoadingMore: false,
    isLoading: false,
    timelineNoteSelectionMode: false,
    timelineSelectedNoteIds: [],
    ...overrides,
  };
}

describe('Timeline note selection', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    appState.set(makeState());
    vi.spyOn(AppController, 'enterTimelineNoteSelection').mockImplementation(
      () => {}
    );
    vi.spyOn(AppController, 'exitTimelineNoteSelection').mockImplementation(
      () => {}
    );
    vi.spyOn(AppController, 'toggleTimelineNoteSelection').mockImplementation(
      () => {}
    );
    vi.spyOn(AppController, 'setTimelineNoteSelection').mockImplementation(
      () => {}
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('exibe checkboxes, contagem e estado marcado', () => {
    const layout = renderTimelineLayout(
      makeState({
        timelineNoteSelectionMode: true,
        timelineSelectedNoteIds: ['note-1'],
      })
    );

    expect(
      layout.querySelector<HTMLElement>('#timeline-selection-bar')?.hidden
    ).toBe(false);
    expect(
      layout.querySelector('#timeline-selection-count')?.textContent
    ).toBe('1 de 2 notas selecionadas');
    expect(
      layout.querySelectorAll('.timeline-entry__select-input')
    ).toHaveLength(2);
    expect(
      layout
        .querySelector('[data-note-id="note-1"]')
        ?.classList.contains('timeline-entry--marked')
    ).toBe(true);
    expect(
      layout
        .querySelector('[data-note-id="note-2"]')
        ?.classList.contains('timeline-entry--marked')
    ).toBe(false);
  });

  it('alterna a seleção ao clicar na nota e não abre a prévia', () => {
    const layout = renderTimelineLayout(
      makeState({ timelineNoteSelectionMode: true })
    );
    document.body.appendChild(layout);

    layout.querySelector<HTMLElement>('[data-note-id="note-2"]')?.click();

    expect(AppController.toggleTimelineNoteSelection).toHaveBeenCalledWith(
      'note-2'
    );
    expect(appState.get().timelinePreviewNoteId).toBeNull();
  });

  it('encaminha o checkbox da nota', () => {
    const layout = renderTimelineLayout(
      makeState({ timelineNoteSelectionMode: true })
    );
    const checkbox = layout.querySelector<HTMLInputElement>(
      '[data-timeline-select="note-2"]'
    )!;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));

    expect(AppController.toggleTimelineNoteSelection).toHaveBeenCalledWith(
      'note-2'
    );
  });

  it('seleciona todas as notas carregadas', () => {
    const layout = renderTimelineLayout(
      makeState({ timelineNoteSelectionMode: true })
    );
    const selectAll = layout.querySelector<HTMLInputElement>(
      '#timeline-select-all'
    )!;
    selectAll.checked = true;
    selectAll.dispatchEvent(new Event('change', { bubbles: true }));

    expect(AppController.setTimelineNoteSelection).toHaveBeenCalledWith([
      'note-1',
      'note-2',
    ]);
  });

  it('entra no modo de seleção pelo botão', () => {
    const layout = renderTimelineLayout(makeState());
    layout
      .querySelector<HTMLButtonElement>('#timeline-note-select-toggle')
      ?.click();

    expect(AppController.enterTimelineNoteSelection).toHaveBeenCalled();
  });

  it('usa o editor de tags com autocomplete das tags existentes', async () => {
    const assign = vi
      .spyOn(AppController, 'assignTagToTimelineSelection')
      .mockResolvedValue(true);
    const tag: TagDTO = {
      id: 'tag-1',
      name: 'projeto',
      normalizedName: 'projeto',
      createdAt: '2026-01-01T00:00:00.000Z',
      origin: 'manual',
      chainCount: 1,
    };
    const layout = renderTimelineLayout(
      makeState({
        timelineNoteSelectionMode: true,
        timelineSelectedNoteIds: ['note-1'],
        allTags: [tag],
      })
    );
    document.body.appendChild(layout);

    layout
      .querySelector<HTMLButtonElement>('.timeline-selection-tags .tag-add')
      ?.click();
    const input = layout.querySelector<HTMLInputElement>(
      '.timeline-selection-tag-input'
    )!;
    input.value = 'proj';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    const option = document.querySelector<HTMLElement>(
      '.tag-suggestions .tag-suggestion'
    );
    expect(option?.textContent).toContain('projeto');

    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
    );
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(assign).toHaveBeenCalledWith('projeto');
  });

  it('renderiza checkboxes quando o modo muda em uma atualização', () => {
    const layout = renderTimelineLayout(makeState());
    document.body.appendChild(layout);

    appState.set({ timelineNoteSelectionMode: true });
    updateTimelineLayout(layout, appState.get());

    expect(
      layout.querySelectorAll('.timeline-entry__select-input')
    ).toHaveLength(2);
    expect(
      layout.querySelector<HTMLElement>('#timeline-selection-bar')?.hidden
    ).toBe(false);
  });
});
