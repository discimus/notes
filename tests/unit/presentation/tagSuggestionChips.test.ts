import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteTagSuggestionDTO } from '@application/dto/index.js';
import { mountInlineTagEditor } from '@presentation/components/InlineTagEditor.js';

function suggestion(
  name: string,
  isNew: boolean
): NoteTagSuggestionDTO {
  return {
    noteId: 'note-1',
    name,
    normalizedName: name,
    score: 0.8,
    isNew,
    ...(isNew ? {} : { existingTagId: 'tag-1' }),
    sources: ['yake', 'tfidf'],
  };
}

describe('chips de sugestão de tags', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renderiza sugestões discretas sem atribuir automaticamente', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const onAdd = vi.fn(() => Promise.resolve(true));
    const editor = mountInlineTagEditor(host, {
      onAdd,
      onRemove: vi.fn(),
      onAcceptSuggestion: vi.fn(() => Promise.resolve(true)),
      onDismissSuggestion: vi.fn(),
    });

    editor.update(
      [],
      [],
      [suggestion('typescript', false), suggestion('testes', true)]
    );

    expect(host.querySelector('.tag-editor__suggestions-label')?.textContent).toBe(
      'Sugestões'
    );
    const label = host.querySelector('.tag-editor__suggestions-label');
    const track = host.querySelector('.tag-editor__suggestions-track');
    expect(host.querySelectorAll('.chip--suggestion')).toHaveLength(2);
    expect(host.querySelector('.chip--suggestion-new')).not.toBeNull();
    expect(track?.contains(label)).toBe(false);
    expect(track?.querySelectorAll('.chip--suggestion')).toHaveLength(2);
    expect(
      host.querySelector<HTMLElement>('.chip--suggestion')?.style.animationDelay
    ).toBe('');
    expect(onAdd).not.toHaveBeenCalled();
    editor.destroy();
  });

  it('aceita e descarta sugestões por ações explícitas', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const onAcceptSuggestion = vi.fn(() => Promise.resolve(true));
    const onDismissSuggestion = vi.fn();
    const editor = mountInlineTagEditor(host, {
      onAdd: vi.fn(() => Promise.resolve(true)),
      onRemove: vi.fn(),
      onAcceptSuggestion,
      onDismissSuggestion,
    });

    editor.update(
      [],
      [],
      [suggestion('typescript', false), suggestion('testes', true)]
    );

    const accept = host.querySelector<HTMLButtonElement>(
      '[aria-label="Adicionar tag typescript"]'
    );
    expect(accept?.querySelector('.chip__suggestion-label')?.textContent).toBe(
      'typescript'
    );
    expect(
      [...(accept?.querySelectorAll('.material-symbols-rounded') ?? [])].map(
        (icon) => icon.textContent
      )
    ).not.toContain('add');

    accept
      ?.querySelector('.chip__suggestion-label')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    host
      .querySelector<HTMLButtonElement>(
        '[aria-label="Descartar sugestão testes"]'
      )
      ?.click();

    await vi.waitFor(() => {
      expect(onAcceptSuggestion).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'typescript' })
      );
    });
    expect(onDismissSuggestion).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'testes' })
    );
    editor.destroy();
  });

  it('reserva espaço somente quando configurado', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const editor = mountInlineTagEditor(host, {
      onAdd: vi.fn(() => Promise.resolve(true)),
      onRemove: vi.fn(),
      onAcceptSuggestion: vi.fn(() => Promise.resolve(true)),
      onDismissSuggestion: vi.fn(),
    });
    const suggestionsHost = host.querySelector<HTMLElement>(
      '.tag-editor__suggestions'
    );

    editor.update([], [], []);
    expect(suggestionsHost?.hidden).toBe(true);

    editor.setSuggestionsReserved(true);
    expect(host.querySelector('.tag-editor')?.classList.contains(
      'tag-editor--suggestions-reserved'
    )).toBe(true);
    expect(suggestionsHost?.hidden).toBe(false);

    editor.setSuggestionsReserved(false);
    expect(suggestionsHost?.hidden).toBe(true);
    editor.destroy();
  });

  it('oculta sugestões já atribuídas', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const editor = mountInlineTagEditor(host, {
      onAdd: vi.fn(() => Promise.resolve(true)),
      onRemove: vi.fn(),
      onAcceptSuggestion: vi.fn(() => Promise.resolve(true)),
    });

    editor.update(
      [
        {
          id: 'tag-1',
          name: 'typescript',
          normalizedName: 'typescript',
          createdAt: '2026-01-01T10:00:00.000Z',
          origin: 'manual',
          chainCount: 1,
        },
      ],
      [],
      [suggestion('typescript', false)]
    );

    expect(host.querySelector('.chip--suggestion')).toBeNull();
    editor.destroy();
  });
});
