import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import type { ChainTab } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import {
  mountChainDocument,
  type ChainDocumentView,
} from '@presentation/components/ChainDocument.js';

const note: NoteDTO = {
  id: 'note-1',
  content: 'Link https://example.com',
  chainId: 'chain-1',
  position: 0,
  role: 'header',
  createdAt: '2026-01-02T10:00:00.000Z',
  updatedAt: '2026-01-02T10:00:00.000Z',
};

const tab: ChainTab = {
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

let view: ChainDocumentView | null = null;

describe('link modifier', () => {
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

    view = mountChainDocument(tab, {
      onNoteInput: vi.fn(),
      onSaveNote: vi.fn(),
      onCreateNote: vi.fn(),
      onSelectNote: vi.fn(),
      onCloseNote: vi.fn(),
    });
    document.body.appendChild(view.element);
  });

  afterEach(() => {
    view?.destroy();
    view = null;
    document.body.innerHTML = '';
  });

  const modifierClass = 'chain-document--link-modifier';

  it('ativa com Ctrl/Cmd pressionado e limpa ao soltar ou perder foco', () => {
    const root = view!.element;

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Control', bubbles: true })
    );
    expect(root.classList.contains(modifierClass)).toBe(true);

    document.dispatchEvent(
      new KeyboardEvent('keyup', { key: 'Control', bubbles: true })
    );
    expect(root.classList.contains(modifierClass)).toBe(false);

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Meta', bubbles: true })
    );
    expect(root.classList.contains(modifierClass)).toBe(true);

    window.dispatchEvent(new Event('blur'));
    expect(root.classList.contains(modifierClass)).toBe(false);
  });

  it('sincroniza com a tecla pressionada durante o pointermove', () => {
    const root = view!.element;

    root.dispatchEvent(
      new MouseEvent('pointermove', { bubbles: true, ctrlKey: true })
    );
    expect(root.classList.contains(modifierClass)).toBe(true);

    root.dispatchEvent(new MouseEvent('pointermove', { bubbles: true }));
    expect(root.classList.contains(modifierClass)).toBe(false);
  });
});
