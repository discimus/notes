import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import type { ChainTab } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import { mountChainDocument } from '@presentation/components/ChainDocument.js';

function makeNote(overrides: Partial<NoteDTO> = {}): NoteDTO {
  return {
    id: 'note-1',
    content: 'Conteúdo da nota',
    chainId: 'chain-1',
    position: 0,
    role: 'header',
    createdAt: '2026-01-02T10:00:00.000Z',
    updatedAt: '2026-01-02T10:00:00.000Z',
    ...overrides,
  };
}

function makeTab(notes: NoteDTO[]): ChainTab {
  return {
    kind: 'chain',
    id: 'tab-chain',
    chainId: 'chain-1',
    title: 'Projeto',
    notes,
    noteTabs: [{ id: 'note-tab-1', content: '' }],
    activeNoteTabId: 'note-tab-1',
    composerCollapsed: false,
    status: 'loaded',
  };
}

function makeHandlers() {
  return {
    onNoteInput: vi.fn(),
    onSaveNote: vi.fn(),
    onCreateNote: vi.fn(),
    onSelectNote: vi.fn(),
    onCloseNote: vi.fn(),
  };
}

describe('Chain note reading flow', () => {
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
    });
  });

  it('mostra o rótulo Início apenas na nota header', () => {
    const tab = makeTab([
      makeNote(),
      makeNote({
        id: 'note-tail',
        content: 'Segunda nota',
        position: 1,
        role: 'tail',
        createdAt: '2026-01-02T11:00:00.000Z',
      }),
    ]);
    const view = mountChainDocument(tab, makeHandlers());
    const articles = [...view.element.querySelectorAll<HTMLElement>('.chain-note')];

    expect(
      articles[0]?.querySelector('.chain-note__role--header')?.textContent
    ).toBe('Início');
    expect(articles[1]?.querySelector('.chain-note__role')).toBeNull();
  });

  it('aplica superfície tonal apenas ao body de código', () => {
    const tab = makeTab([
      makeNote(),
      makeNote({
        id: 'note-code',
        content: 'const value = 1;',
        position: 1,
        role: 'tail',
        contentType: 'code',
      }),
    ]);
    const view = mountChainDocument(tab, makeHandlers());
    const textBody = view.element.querySelector<HTMLElement>(
      '[data-note-id="note-1"] .chain-note__body'
    );
    const codeBody = view.element.querySelector<HTMLElement>(
      '[data-note-id="note-code"] .chain-note__body'
    );

    expect(textBody?.classList.contains('chain-note__body--code')).toBe(false);
    expect(codeBody?.classList.contains('chain-note__body--code')).toBe(true);
    expect(codeBody?.querySelector('.chain-note__text--code')?.textContent).toBe(
      'const value = 1;'
    );
  });

  it('mantém metadados fora do body e o horário acessível', () => {
    const tab = makeTab([
      makeNote(),
      makeNote({
        id: 'note-tail',
        content: 'Segunda nota',
        position: 1,
        role: 'tail',
        createdAt: '2026-01-02T11:30:00.000Z',
        updatedAt: '2026-01-02T12:00:00.000Z',
      }),
    ]);
    const view = mountChainDocument(tab, makeHandlers());
    const articles = [...view.element.querySelectorAll<HTMLElement>('.chain-note')];

    for (const article of articles) {
      const meta = article.querySelector<HTMLElement>('.chain-note__meta');
      const body = article.querySelector<HTMLElement>('.chain-note__body');
      const text = body?.querySelector('.chain-note__text');
      const time = meta?.querySelector<HTMLTimeElement>('.chain-note__time');

      expect(meta).not.toBeNull();
      expect(body).not.toBeNull();
      expect(meta?.contains(text ?? null)).toBe(false);
      expect(time?.dateTime).toBeTruthy();
      expect(
        article.querySelector<HTMLButtonElement>('.chain-note__edit')?.getAttribute(
          'aria-label'
        )
      ).toBe('Editar nota');
    }
  });
});
