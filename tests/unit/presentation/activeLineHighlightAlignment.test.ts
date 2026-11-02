import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountActiveLineHighlight } from '@presentation/components/ActiveLineHighlight.js';

function rect(top: number): DOMRect {
  return {
    x: 0,
    y: top,
    top,
    left: 0,
    right: 300,
    bottom: top + 20,
    width: 300,
    height: 20,
    toJSON: () => ({}),
  };
}

describe('ActiveLineHighlight — alinhamento vertical', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('usa o topo do line box e desconta o scroll do textarea', async () => {
    const container = document.createElement('div');
    const textarea = document.createElement('textarea');
    textarea.value = 'primeira linha\nsegunda linha';
    textarea.style.fontSize = '16px';
    textarea.style.lineHeight = '20px';
    textarea.style.padding = '10px';
    textarea.scrollTop = 10;
    Object.defineProperty(textarea, 'clientWidth', {
      value: 300,
      configurable: true,
    });
    Object.defineProperty(textarea, 'clientHeight', {
      value: 200,
      configurable: true,
    });
    container.appendChild(textarea);
    document.body.appendChild(container);

    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: Element) {
        if (this.classList.contains('active-line-mirror')) return rect(0);
        if (this.closest('.active-line-mirror')) return rect(50);
        return rect(0);
      }
    );

    const view = mountActiveLineHighlight(textarea, container);
    textarea.focus();
    textarea.dispatchEvent(new FocusEvent('focus'));

    const highlight = container.querySelector<HTMLElement>(
      '.active-line-highlight'
    )!;
    await vi.waitFor(() => {
      expect(highlight.hidden).toBe(false);
    });

    expect(highlight.style.top).toBe('40px');
    expect(highlight.style.height).toBe('20px');

    const marker = container.querySelector<HTMLElement>(
      '.active-line-mirror span'
    );
    expect(marker?.style.display).toBe('inline-block');
    expect(marker?.style.height).toBe('20px');
    expect(marker?.style.verticalAlign).toBe('top');

    view.destroy();
  });
});
