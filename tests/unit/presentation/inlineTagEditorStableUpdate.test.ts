import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TagDTO } from '@application/dto/index.js';
import { mountInlineTagEditor } from '@presentation/components/InlineTagEditor.js';

function makeTag(overrides: Partial<TagDTO> = {}): TagDTO {
  return {
    id: 'tag-1',
    name: 'pesquisa',
    normalizedName: 'pesquisa',
    createdAt: '2026-01-01T10:00:00.000Z',
    origin: 'manual',
    chainCount: 1,
    ...overrides,
  };
}

describe('InlineTagEditor update estável', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('não recria os chips quando as tags permanecem iguais', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const editor = mountInlineTagEditor(host, {
      onAdd: vi.fn().mockResolvedValue(true),
      onRemove: vi.fn(),
    });
    const tag = makeTag();

    editor.update([tag], [tag]);
    const chip = host.querySelector('.chip--selected');
    editor.update([{ ...tag }], [{ ...tag }]);

    expect(host.querySelector('.chip--selected')).toBe(chip);
    editor.destroy();
  });

  it('recria os chips quando a lista de tags muda', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const editor = mountInlineTagEditor(host, {
      onAdd: vi.fn().mockResolvedValue(true),
      onRemove: vi.fn(),
    });
    const tag = makeTag();

    editor.update([tag], [tag]);
    const previous = host.querySelector('.chip--selected');
    editor.update([makeTag({ name: 'estudo' })], [tag]);

    const next = host.querySelector('.chip--selected');
    expect(next).not.toBe(previous);
    expect(next?.textContent).toContain('estudo');
    editor.destroy();
  });
});
