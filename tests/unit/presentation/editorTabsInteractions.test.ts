import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderTabList } from '@presentation/components/EditorTabs.js';

const items = [
  { id: 'tab-1', label: 'Documento 1', icon: 'edit_note', dirty: false },
  { id: 'tab-2', label: 'Documento 2', icon: 'edit_note', dirty: false },
];

describe('interações extras das abas', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  function render() {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const onCreate = vi.fn();
    const onClose = vi.fn();
    const onSelect = vi.fn();

    renderTabList(container, items, 'tab-1', {
      onSelect,
      onClose,
      onCreate,
    });

    return { container, onCreate, onClose, onSelect };
  }

  it('cria documento com duplo clique apenas no espaço vazio', () => {
    const { container, onCreate } = render();

    container.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(onCreate).toHaveBeenCalledTimes(1);

    container
      .querySelector('[role="tab"]')
      ?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('fecha a aba com clique do scroll e evita autoscroll', () => {
    const { container, onClose } = render();
    const wrapper = container.querySelector<HTMLElement>('[data-tab-id="tab-1"]');
    if (!wrapper) throw new Error('Aba não encontrada');

    const mouseDown = new MouseEvent('mousedown', {
      button: 1,
      bubbles: true,
      cancelable: true,
    });
    wrapper.dispatchEvent(mouseDown);
    expect(mouseDown.defaultPrevented).toBe(true);

    wrapper.dispatchEvent(
      new MouseEvent('auxclick', {
        button: 1,
        bubbles: true,
        cancelable: true,
      })
    );
    expect(onClose).toHaveBeenCalledWith('tab-1');

    wrapper.dispatchEvent(
      new MouseEvent('auxclick', {
        button: 0,
        bubbles: true,
        cancelable: true,
      })
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
