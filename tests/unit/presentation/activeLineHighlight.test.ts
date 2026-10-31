import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountActiveLineHighlight } from '@presentation/components/ActiveLineHighlight.js';

describe('ActiveLineHighlight', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('cria a camada visual e o espelho ocultos', () => {
    const container = document.createElement('div');
    const textarea = document.createElement('textarea');
    container.appendChild(textarea);
    document.body.appendChild(container);

    const view = mountActiveLineHighlight(textarea, container);

    const highlight = container.querySelector<HTMLElement>('.active-line-highlight');
    const mirror = container.querySelector<HTMLElement>('.active-line-mirror');

    expect(highlight).not.toBeNull();
    expect(highlight?.hidden).toBe(true);
    expect(highlight?.getAttribute('aria-hidden')).toBe('true');
    expect(mirror).not.toBeNull();
    expect(mirror?.getAttribute('aria-hidden')).toBe('true');

    view.destroy();
  });

  it('mostra o realce no foco e esconde no blur', async () => {
    const container = document.createElement('div');
    const textarea = document.createElement('textarea');
    textarea.value = 'linha um\nlinha dois';
    container.appendChild(textarea);
    document.body.appendChild(container);

    const view = mountActiveLineHighlight(textarea, container);
    const highlight = container.querySelector<HTMLElement>('.active-line-highlight')!;

    textarea.focus();
    textarea.dispatchEvent(new FocusEvent('focus'));

    await vi.waitFor(() => {
      expect(highlight.hidden).toBe(false);
    });

    textarea.blur();
    textarea.dispatchEvent(new FocusEvent('blur'));
    expect(highlight.hidden).toBe(true);

    view.destroy();
  });

  it('remove camada, espelho e listeners ao destruir', () => {
    const container = document.createElement('div');
    const textarea = document.createElement('textarea');
    container.appendChild(textarea);
    document.body.appendChild(container);

    const view = mountActiveLineHighlight(textarea, container);
    view.destroy();

    expect(container.querySelector('.active-line-highlight')).toBeNull();
    expect(container.querySelector('.active-line-mirror')).toBeNull();
    expect(textarea.isConnected).toBe(true);
  });
});
