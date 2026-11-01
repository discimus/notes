import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EditorStore } from '@presentation/state/EditorStore.js';
import {
  renderEditorTabs,
  updateTabDirtyState,
} from '@presentation/components/EditorTabs.js';

describe('EditorTabs preview state', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('diferencia visual e semanticamente a aba de prévia', () => {
    const store = new EditorStore(sessionStorage);
    store.openChainTab('chain-1', 'Projeto', { preview: true });
    const container = document.createElement('div');

    renderEditorTabs(container, store.getSnapshot(), {
      onSelect: vi.fn(),
      onClose: vi.fn(),
    });

    const wrapper = container.querySelector<HTMLElement>('.editor-tab')!;
    const button = wrapper.querySelector<HTMLButtonElement>('[role="tab"]')!;

    expect(wrapper.classList.contains('editor-tab--preview')).toBe(true);
    expect(button.getAttribute('aria-description')).toContain('prévia substituível');
    expect(button.title).toContain('prévia substituível');
  });

  it('remove a marcação de prévia quando a aba é promovida', () => {
    const store = new EditorStore(sessionStorage);
    const tab = store.openChainTab('chain-1', 'Projeto', { preview: true });
    const container = document.createElement('div');

    renderEditorTabs(container, store.getSnapshot(), {
      onSelect: vi.fn(),
      onClose: vi.fn(),
    });

    const note = store.getActiveChainNoteTab(tab.id)!;
    store.updateChainNoteTab(tab.id, note.id, 'Conteúdo');
    const updated = store.getTab(tab.id)!;
    updateTabDirtyState(container, updated);

    const wrapper = container.querySelector<HTMLElement>('.editor-tab')!;
    const button = wrapper.querySelector<HTMLButtonElement>('[role="tab"]')!;

    expect(wrapper.classList.contains('editor-tab--preview')).toBe(false);
    expect(button.hasAttribute('aria-description')).toBe(false);
    expect(button.title).not.toContain('prévia substituível');
  });
});
