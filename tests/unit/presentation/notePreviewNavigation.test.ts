import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import { renderNotePreview } from '@presentation/components/NotePreview.js';

function note(id: string, content: string): NoteDTO {
  return {
    id,
    content,
    chainId: 'chain-1',
    position: 1,
    role: 'tail',
    createdAt: '2026-01-02T10:00:00.000Z',
    updatedAt: '2026-01-02T10:00:00.000Z',
  };
}

describe('NotePreview - navegacao entre notas', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renderiza botoes acessiveis e dispara anterior/proxima', () => {
    const host = document.createElement('aside');
    document.body.appendChild(host);
    const onPrevious = vi.fn();
    const onNext = vi.fn();

    renderNotePreview(
      host,
      {
        chainId: 'chain-1',
        chainTitle: 'Projeto',
        note: note('note-2', 'Conteudo'),
      },
      { navigation: { hasPrevious: true, hasNext: true, onPrevious, onNext } }
    );

    const nav = host.querySelector<HTMLElement>(
      '.timeline-preview__note-nav'
    );
    expect(nav?.getAttribute('aria-label')).toBe('Navegação entre notas');

    const previous = host.querySelector<HTMLButtonElement>(
      '[data-preview-nav="previous"]'
    );
    const next = host.querySelector<HTMLButtonElement>(
      '[data-preview-nav="next"]'
    );

    expect(previous?.getAttribute('aria-label')).toBe('Nota anterior');
    expect(next?.getAttribute('aria-label')).toBe('Próxima nota');
    expect(
      previous?.querySelector('.material-symbols-rounded')?.textContent
    ).toBe('arrow_upward');
    expect(next?.querySelector('.material-symbols-rounded')?.textContent).toBe(
      'arrow_downward'
    );
    expect(previous?.disabled).toBe(false);
    expect(next?.disabled).toBe(false);

    previous?.click();
    next?.click();

    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('desabilita os botoes nos limites e durante carregamento', () => {
    const host = document.createElement('aside');
    document.body.appendChild(host);

    renderNotePreview(
      host,
      {
        chainId: 'chain-1',
        chainTitle: 'Projeto',
        note: note('note-1', 'Conteudo'),
      },
      {
        navigation: {
          hasPrevious: false,
          hasNext: false,
          busy: true,
          onPrevious: vi.fn(),
          onNext: vi.fn(),
        },
      }
    );

    expect(
      host.querySelector<HTMLButtonElement>(
        '[data-preview-nav="previous"]'
      )?.disabled
    ).toBe(true);
    expect(
      host.querySelector<HTMLButtonElement>('[data-preview-nav="next"]')
        ?.disabled
    ).toBe(true);
    expect(
      host
        .querySelector<HTMLElement>('.timeline-preview__note-nav')
        ?.getAttribute('aria-busy')
    ).toBe('true');
  });
});
