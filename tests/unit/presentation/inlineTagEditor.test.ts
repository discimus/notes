import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TagDTO } from '@application/dto/index.js';
import { mountInlineTagEditor } from '@presentation/components/InlineTagEditor.js';

function makeTag(id: string, name: string): TagDTO {
  return {
    id,
    name,
    normalizedName: name.toLowerCase(),
    createdAt: '2026-01-01T00:00:00.000Z',
    origin: 'manual',
    chainCount: 1,
  };
}

describe('InlineTagEditor', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  function render(tags: TagDTO[] = [], availableTags: TagDTO[] = []) {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const onAdd = vi.fn().mockResolvedValue(true);
    const onRemove = vi.fn();
    const view = mountInlineTagEditor(container, { onAdd, onRemove });
    view.update(tags, availableTags);
    return { container, view, onAdd, onRemove };
  }

  function startInput(container: HTMLElement): HTMLInputElement {
    container.querySelector<HTMLButtonElement>('.tag-add')?.click();
    const input = container.querySelector<HTMLInputElement>('.tag-add__input');
    if (!input) throw new Error('Input de tag não encontrado');
    return input;
  }

  it('transforma o botão de adicionar em input', () => {
    const { container } = render();
    const input = startInput(container);

    expect(input.getAttribute('aria-label')).toBe('Nova tag');
    expect(document.activeElement).toBe(input);
    expect(container.querySelector('.tag-add--editing')).not.toBeNull();
  });

  it('salva ao pressionar Enter e mantém o input ativo', async () => {
    const { container, onAdd } = render();
    const input = startInput(container);

    input.value = 'trabalho';
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    );

    await vi.waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith('trabalho');
      expect(input.value).toBe('');
    });
    expect(document.activeElement).toBe(input);
    expect(container.querySelector('.tag-add--editing')).not.toBeNull();
  });

  it('permite cadastrar várias tags em sequência', async () => {
    const { container, onAdd } = render();
    const input = startInput(container);

    input.value = 'primeira';
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    );
    await vi.waitFor(() => {
      expect(onAdd).toHaveBeenCalledTimes(1);
      expect(input.value).toBe('');
    });

    input.value = 'segunda';
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    );
    await vi.waitFor(() => {
      expect(onAdd).toHaveBeenCalledTimes(2);
      expect(input.value).toBe('');
    });

    expect(onAdd.mock.calls.map(([name]) => name)).toEqual(['primeira', 'segunda']);
  });

  it('salva ao perder o foco e fecha o input', async () => {
    const { container, onAdd } = render();
    const input = startInput(container);

    input.value = 'projeto';
    input.dispatchEvent(new FocusEvent('blur'));

    await vi.waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith('projeto');
      expect(container.querySelector('.tag-add__input')).toBeNull();
    });
  });

  it('cancela ao pressionar Escape', () => {
    const { container } = render();
    const input = startInput(container);

    input.value = 'temporaria';
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    );

    expect(container.querySelector('.tag-add__input')).toBeNull();
    expect(container.querySelector('.tag-add')).not.toBeNull();
  });

  it('sugere tags existentes por prefixo e adiciona a opção destacada', async () => {
    const existing = [
      makeTag('tag-1', 'Projeto'),
      makeTag('tag-2', 'Projetos antigos'),
      makeTag('tag-3', 'Pessoal'),
    ];
    const { container, onAdd } = render([], existing);
    const input = startInput(container);

    input.value = 'proj';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    const listbox = document.querySelector<HTMLElement>('.tag-suggestions');
    const options = listbox?.querySelectorAll('[role="option"]');
    expect(listbox?.hidden).toBe(false);
    expect(options).toHaveLength(2);
    expect(input.getAttribute('aria-expanded')).toBe('true');

    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
    );
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    );

    await vi.waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith('Projeto');
      expect(input.value).toBe('');
    });
    expect(listbox?.hidden).toBe(true);
  });

  it('seleciona sugestão com clique sem perder o foco do input', async () => {
    const { container, onAdd } = render(
      [],
      [makeTag('tag-1', 'Trabalho')]
    );
    const input = startInput(container);

    input.value = 'tra';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    document
      .querySelector<HTMLElement>('.tag-suggestion')
      ?.dispatchEvent(
        new MouseEvent('pointerdown', { bubbles: true, cancelable: true })
      );

    await vi.waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith('Trabalho');
    });
    expect(document.activeElement).toBe(input);
  });

  it('fecha a lista com Escape antes de cancelar o input', () => {
    const { container } = render([], [makeTag('tag-1', 'Trabalho')]);
    const input = startInput(container);

    input.value = 'tra';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    );
    expect(container.querySelector('.tag-add__input')).toBe(input);
    expect(document.querySelector<HTMLElement>('.tag-suggestions')?.hidden).toBe(
      true
    );

    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    );
    expect(container.querySelector('.tag-add__input')).toBeNull();
  });

  it('impede tag duplicada e mantém o texto', () => {
    const { container, onAdd } = render([makeTag('tag-1', 'Projeto')]);
    const input = startInput(container);

    input.value = 'projeto';
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    );

    expect(onAdd).not.toHaveBeenCalled();
    expect(input.value).toBe('projeto');
    expect(container.querySelector('.tag-editor__error')?.textContent).toContain(
      'já está adicionada'
    );
  });
});
