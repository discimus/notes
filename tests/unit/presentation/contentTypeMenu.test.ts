import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountContentTypeMenu } from '@presentation/components/ContentTypeMenu.js';

let destroy: (() => void) | null = null;

describe('ContentTypeMenu', () => {
  afterEach(() => {
    destroy?.();
    destroy = null;
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('abre menu MD3 e altera o tipo selecionado', () => {
    const onChange = vi.fn();
    const view = mountContentTypeMenu({ value: 'text', onChange });
    destroy = view.destroy;
    document.body.appendChild(view.element);

    const button = view.element.querySelector<HTMLButtonElement>(
      '.content-type-control__button'
    )!;
    expect(button.textContent).toContain('Texto');
    expect(button.getAttribute('aria-haspopup')).toBe('menu');
    expect(button.getAttribute('aria-expanded')).toBe('false');

    button.click();

    expect(button.getAttribute('aria-expanded')).toBe('true');
    const menu = document.querySelector('[role="menu"]');
    const options = [...document.querySelectorAll<HTMLElement>('[role="menuitemradio"]')];
    expect(menu).not.toBeNull();
    expect(options).toHaveLength(2);
    expect(options[0]?.getAttribute('aria-checked')).toBe('true');
    expect(options[1]?.getAttribute('aria-checked')).toBe('false');

    options[1]?.click();

    expect(onChange).toHaveBeenCalledWith('code');
    expect(button.textContent).toContain('Código');
    expect(document.querySelector('[role="menu"]')).toBeNull();
  });

  it('suporta teclado, Escape e restauração de foco', () => {
    const view = mountContentTypeMenu({ value: 'text', onChange: vi.fn() });
    destroy = view.destroy;
    document.body.appendChild(view.element);

    const button = view.element.querySelector<HTMLButtonElement>(
      '.content-type-control__button'
    )!;
    button.focus();
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

    const option = document.activeElement as HTMLElement;
    expect(option.getAttribute('role')).toBe('menuitemradio');

    option.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(document.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it('alterna com scroll sem abrir o menu e sem repetir no mesmo gesto', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const view = mountContentTypeMenu({ value: 'text', onChange });
    destroy = view.destroy;
    document.body.appendChild(view.element);

    const button = view.element.querySelector<HTMLButtonElement>(
      '.content-type-control__button'
    )!;
    const first = new WheelEvent('wheel', {
      deltaY: 100,
      bubbles: true,
      cancelable: true,
    });
    button.dispatchEvent(first);

    expect(first.defaultPrevented).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('code');
    expect(document.querySelector('[role="menu"]')).toBeNull();

    button.dispatchEvent(
      new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true })
    );
    expect(onChange).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(300);
    button.dispatchEvent(
      new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true })
    );
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith('text');
    expect(document.querySelector('[role="menu"]')).toBeNull();
  });
});
