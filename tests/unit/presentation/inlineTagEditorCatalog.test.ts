import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GetStandardTags } from '@application/use-cases/GetStandardTags.js';
import { mountInlineTagEditor } from '@presentation/components/InlineTagEditor.js';

describe('catálogo no autocomplete de tags', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('oferece tags padrão mesmo sem tags existentes e só cria ao selecionar', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const onAdd = vi.fn(() => Promise.resolve(true));
    const editor = mountInlineTagEditor(host, {
      onAdd,
      onRemove: vi.fn(),
    });
    editor.update([], [], [], new GetStandardTags().execute());

    host.querySelector<HTMLButtonElement>('.tag-add')?.click();
    const input = host.querySelector<HTMLInputElement>('.tag-add__input');
    if (!input) throw new Error('Input não encontrado');

    input.value = 'prog';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')]
      .find((item) => item.textContent?.includes('Programação'));
    expect(option?.textContent).toContain('padrão');
    expect(onAdd).not.toHaveBeenCalled();

    option?.dispatchEvent(new Event('pointerdown', { bubbles: true }));

    await vi.waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith('Programação');
    });
    editor.destroy();
  });
});
