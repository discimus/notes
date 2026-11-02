import { beforeEach, describe, expect, it, vi } from 'vitest';
import { showTagMenu } from '@presentation/components/TagMenu.js';

function trigger(): HTMLButtonElement {
  const button = document.createElement('button');
  button.setAttribute('aria-expanded', 'false');
  document.body.appendChild(button);
  return button;
}

describe('TagMenu', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('oferece renomear e excluir com callbacks isolados', () => {
    const onRename = vi.fn();
    const onDelete = vi.fn();
    const button = trigger();
    button.addEventListener('click', (event) => {
      showTagMenu(event, 'Projetos', { onRename, onDelete });
    });

    button.click();
    const menu = document.querySelector<HTMLElement>('#tag-menu');
    expect(menu?.getAttribute('role')).toBe('menu');
    expect(button.getAttribute('aria-expanded')).toBe('true');

    const items = [
      ...document.querySelectorAll<HTMLButtonElement>('.chain-menu__item'),
    ];
    expect(items.map((item) => item.getAttribute('aria-label'))).toEqual([
      'Renomear',
      'Excluir',
    ]);

    items[0]?.click();
    expect(onRename).toHaveBeenCalledTimes(1);
    expect(onDelete).not.toHaveBeenCalled();
    expect(document.querySelector('#tag-menu')).toBeNull();
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  it('fecha com Escape e devolve o foco ao gatilho', () => {
    const button = trigger();
    button.addEventListener('click', (event) => {
      showTagMenu(event, 'Projetos', {
        onRename: vi.fn(),
        onDelete: vi.fn(),
      });
    });

    button.click();
    const menu = document.querySelector<HTMLElement>('#tag-menu')!;
    menu.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    );

    expect(document.querySelector('#tag-menu')).toBeNull();
    expect(document.activeElement).toBe(button);
  });
});
