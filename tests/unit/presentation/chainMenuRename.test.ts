import { beforeEach, describe, expect, it, vi } from 'vitest';
import { showChainMenu } from '@presentation/views/menus.js';

function button(): HTMLButtonElement {
  const element = document.createElement('button');
  document.body.appendChild(element);
  return element;
}

describe('Chain menu rename', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('mostra Renomear quando há callback e fecha ao clicar', () => {
    const onRename = vi.fn();
    const trigger = button();
    trigger.addEventListener('click', (event) => {
      showChainMenu(event, 'chain-1', { onRename });
    });
    trigger.click();

    const items = [...document.querySelectorAll<HTMLButtonElement>('.chain-menu__item')];
    const rename = items.find((item) => item.textContent?.includes('Renomear'));
    expect(rename).not.toBeUndefined();

    rename?.click();
    expect(onRename).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.chain-menu')).toBeNull();
  });

  it('não mostra Renomear sem callback', () => {
    const trigger = button();
    trigger.addEventListener('click', (event) => {
      showChainMenu(event, 'chain-1');
    });
    trigger.click();

    expect(document.querySelector('.chain-menu')?.textContent).not.toContain('Renomear');
  });
});
