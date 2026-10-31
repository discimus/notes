import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderEditorTabs } from '@presentation/components/EditorTabs.js';
import type { EditorSnapshot } from '@presentation/state/EditorStore.js';

const snapshot: EditorSnapshot = {
  activeTabId: 'tab-1',
  tabs: [
    {
      kind: 'draft',
      id: 'tab-1',
      title: 'Primeiro documento',
      content: 'Conteúdo',
      savedContent: 'Conteúdo',
      target: null,
    },
    {
      kind: 'draft',
      id: 'tab-2',
      title: 'Segundo documento',
      content: 'Rascunho',
      savedContent: '',
      target: null,
    },
  ],
};

describe('EditorTabs', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renderiza tablist acessível com aba ativa e indicador dirty', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    renderEditorTabs(container, snapshot, {
      onSelect: vi.fn(),
      onClose: vi.fn(),
    });

    const tabs = [...container.querySelectorAll<HTMLElement>('[role="tab"]')];

    expect(container.getAttribute('role')).toBe('tablist');
    expect(tabs).toHaveLength(2);
    expect(tabs[0]?.getAttribute('aria-selected')).toBe('true');
    expect(tabs[0]?.tabIndex).toBe(0);
    expect(tabs[1]?.getAttribute('aria-selected')).toBe('false');
    expect(tabs[1]?.tabIndex).toBe(-1);
    expect(container.querySelectorAll('.editor-tab--dirty')).toHaveLength(1);
    expect(container.querySelector('.editor-tab__icon')?.textContent).toBe('edit_note');
  });

  it('navega entre abas com as setas e não seleciona ao fechar', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const onSelect = vi.fn();
    const onClose = vi.fn();

    renderEditorTabs(container, snapshot, { onSelect, onClose });

    const firstTab = container.querySelector<HTMLElement>('[role="tab"]');
    firstTab?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
    );
    expect(onSelect).toHaveBeenCalledWith('tab-2');

    const close = container.querySelectorAll<HTMLElement>('.editor-tab__close')[1];
    close?.click();
    expect(onClose).toHaveBeenCalledWith('tab-2');
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
