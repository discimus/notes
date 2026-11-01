import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import type { ChainTab } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import { mountChainDocument } from '@presentation/components/ChainDocument.js';

const content = 'Veja https://example.com/docs e www.openai.com. Fim.';

function makeNote(overrides: Partial<NoteDTO> = {}): NoteDTO {
  return {
    id: 'note-1',
    content,
    chainId: 'chain-1',
    position: 0,
    role: 'header',
    createdAt: '2026-01-02T10:00:00.000Z',
    updatedAt: '2026-01-02T10:00:00.000Z',
    ...overrides,
  };
}

function makeTab(note: NoteDTO = makeNote()): ChainTab {
  return {
    kind: 'chain',
    id: 'tab-chain',
    chainId: 'chain-1',
    title: 'Projeto',
    notes: [note],
    noteTabs: [{ id: 'note-tab-1', content: '' }],
    activeNoteTabId: 'note-tab-1',
    composerCollapsed: true,
    status: 'loaded',
  };
}

function makeHandlers(overrides: Record<string, unknown> = {}) {
  return {
    onNoteInput: vi.fn(),
    onSaveNote: vi.fn(),
    onEditNote: vi.fn(),
    onCreateNote: vi.fn(),
    onSelectNote: vi.fn(),
    onCloseNote: vi.fn(),
    ...overrides,
  };
}

function mount(note?: NoteDTO, overrides: Record<string, unknown> = {}) {
  const handlers = makeHandlers(overrides);
  const view = mountChainDocument(makeTab(note), handlers);
  document.body.appendChild(view.element);
  const text = view.element.querySelector<HTMLElement>('.chain-note__text');
  if (!text) throw new Error('Texto da nota não encontrado');
  return { view, text, handlers };
}

function clickEvent(overrides: MouseEventInit = {}): MouseEvent {
  return new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    detail: 1,
    ...overrides,
  });
}

describe('links nas notas', () => {
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

  it('renderiza links seguros e ícone sem alterar o texto puro', () => {
    const { text } = mount();
    const links = [...text.querySelectorAll<HTMLAnchorElement>('.chain-note__link')];
    const icons = [...text.querySelectorAll<HTMLAnchorElement>('.chain-note__link-icon')];

    expect(text.textContent).toBe(content);
    expect(links).toHaveLength(2);
    expect(links[0]?.href).toBe('https://example.com/docs');
    expect(links[0]?.textContent).toBe('https://example.com/docs');
    expect(links[0]?.target).toBe('_blank');
    expect(links[0]?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(links[1]?.href).toBe('https://www.openai.com/');
    expect(links[1]?.textContent).toBe('www.openai.com');

    expect(icons).toHaveLength(2);
    for (const icon of icons) {
      expect(icon.target).toBe('_blank');
      expect(icon.getAttribute('rel')).toBe('noopener noreferrer');
      expect(icon.getAttribute('aria-hidden')).toBe('true');
      expect(icon.tabIndex).toBe(-1);
    }
  });

  it('permite nova aba por Ctrl, teclado e ícone, mas não por clique simples', () => {
    const { text } = mount();
    const link = text.querySelector<HTMLAnchorElement>('.chain-note__link');
    const icon = text.querySelector<HTMLAnchorElement>('.chain-note__link-icon');
    if (!link || !icon) throw new Error('Link ou ícone não encontrado');

    const plain = clickEvent();
    link.dispatchEvent(plain);
    expect(plain.defaultPrevented).toBe(true);

    let ctrlOpened = false;
    link.addEventListener('click', (event) => {
      ctrlOpened = !event.defaultPrevented;
      event.preventDefault();
    }, { once: true });
    link.dispatchEvent(clickEvent({ ctrlKey: true }));
    expect(ctrlOpened).toBe(true);

    let keyboardOpened = false;
    link.addEventListener('click', (event) => {
      keyboardOpened = !event.defaultPrevented;
      event.preventDefault();
    }, { once: true });
    link.dispatchEvent(clickEvent({ detail: 0 }));
    expect(keyboardOpened).toBe(true);

    let iconOpened = false;
    icon.addEventListener('click', (event) => {
      iconOpened = !event.defaultPrevented;
      event.preventDefault();
    }, { once: true });
    icon.dispatchEvent(clickEvent());
    expect(iconOpened).toBe(true);
  });

  it('encaminha a edição para o compositor sem alterar os links no histórico', () => {
    const onEditNote = vi.fn();
    const { view, text } = mount(undefined, { onEditNote });
    const edit = view.element.querySelector<HTMLButtonElement>('.chain-note__edit');
    if (!edit) throw new Error('Ação de editar não encontrada');

    edit.click();

    expect(onEditNote).toHaveBeenCalledWith('note-1');
    expect(text.querySelectorAll('.chain-note__link')).toHaveLength(2);
    expect(text.contentEditable).not.toBe('true');
  });

  it('não linkifica notas de código', () => {
    const { text } = mount(
      makeNote({ contentType: 'code', content: 'const url = "https://example.com";' })
    );

    expect(text.querySelector('.chain-note__link')).toBeNull();
    expect(text.textContent).toBe('const url = "https://example.com";');
  });
});
