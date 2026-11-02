import { beforeEach, describe, expect, it, vi } from 'vitest';
import { beginTabRename, renderTabList } from '@presentation/components/EditorTabs.js';

const items = [
  { id: 'chain-tab', label: 'Projeto', icon: 'account_tree', dirty: false, renamable: true },
  { id: 'draft-tab', label: 'Documento', icon: 'edit_note', dirty: false },
];

function render() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const onRename = vi.fn();
  renderTabList(container, items, 'chain-tab', {
    onSelect: vi.fn(),
    onClose: vi.fn(),
    onRename,
  });
  return { container, onRename };
}

function openRename(container: HTMLElement, tabId = 'chain-tab'): HTMLInputElement {
  const label = container.querySelector<HTMLElement>(
    `[data-tab-id="${tabId}"] .editor-tab__label`
  );
  label?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
  const input = container.querySelector<HTMLInputElement>('.editor-tab__rename-input');
  if (!input) throw new Error('Input de rename não encontrado');
  return input;
}

describe('Editor tab rename', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('abre input com o título atual ao dar duplo clique', () => {
    const { container } = render();
    const input = openRename(container);

    expect(input.value).toBe('Projeto');
    expect(document.activeElement).toBe(input);
    expect(input.getAttribute('aria-label')).toBe('Renomear coleção');
    expect(
      container.querySelector<HTMLButtonElement>(
        '[data-tab-id="chain-tab"] .editor-tab__button'
      )?.hidden
    ).toBe(true);
  });

  it('salva com Enter chamando onRename', () => {
    const { container, onRename } = render();
    const input = openRename(container);
    input.value = '  Novo título  ';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(onRename).toHaveBeenCalledWith('chain-tab', 'Novo título');
    expect(container.querySelector('.editor-tab__rename-input')).toBeNull();
  });

  it('cancela com Escape e com blur', () => {
    const { container, onRename } = render();
    const input = openRename(container);
    input.value = 'Outro título';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(onRename).not.toHaveBeenCalled();
    expect(container.querySelector('.editor-tab__rename-input')).toBeNull();

    const second = openRename(container);
    second.value = 'Outro título';
    second.dispatchEvent(new FocusEvent('blur'));

    expect(onRename).not.toHaveBeenCalled();
    expect(container.querySelector('.editor-tab__rename-input')).toBeNull();
  });

  it('não salva título vazio e sinaliza o input', () => {
    const { container, onRename } = render();
    const input = openRename(container);
    input.value = '   ';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(onRename).not.toHaveBeenCalled();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(container.querySelector('.editor-tab__rename-input')).toBe(input);
  });

  it('não chama onRename quando o título não muda', () => {
    const { container, onRename } = render();
    const input = openRename(container);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(onRename).not.toHaveBeenCalled();
    expect(container.querySelector('.editor-tab__rename-input')).toBeNull();
  });

  it('não permite renomear rascunho e inicia pelo helper', () => {
    const { container } = render();
    container
      .querySelector('[data-tab-id="draft-tab"] .editor-tab__label')
      ?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(container.querySelector('.editor-tab__rename-input')).toBeNull();

    expect(beginTabRename(container, 'chain-tab')).toBe(true);
    expect(container.querySelector('.editor-tab__rename-input')).not.toBeNull();
  });
});
