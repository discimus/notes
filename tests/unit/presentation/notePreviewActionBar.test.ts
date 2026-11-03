import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import { renderNotePreview } from '@presentation/components/NotePreview.js';

function note(id: string): NoteDTO {
  return {
    id,
    content: 'Conteudo',
    chainId: 'chain-1',
    position: 1,
    role: 'tail',
    createdAt: '2026-01-02T10:00:00.000Z',
    updatedAt: '2026-01-02T10:00:00.000Z',
  };
}

describe('NotePreview - action bar centralizado', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('agrupa navegacao e fab de edicao no mesmo container', () => {
    const host = document.createElement('aside');
    document.body.appendChild(host);

    renderNotePreview(
      host,
      {
        chainId: 'chain-1',
        chainTitle: 'Projeto',
        note: note('note-1'),
      },
      {
        action: {
          label: 'Editar nota',
          icon: 'edit',
          variant: 'fab',
          onClick: vi.fn(),
        },
        navigation: {
          hasPrevious: true,
          hasNext: true,
          onPrevious: vi.fn(),
          onNext: vi.fn(),
        },
      }
    );

    const bar = host.querySelector<HTMLElement>(
      '.timeline-preview__action-bar'
    );
    const nav = host.querySelector<HTMLElement>('.timeline-preview__note-nav');
    const edit = host.querySelector<HTMLElement>(
      '.timeline-preview__actions--fab'
    );

    expect(bar?.getAttribute('role')).toBe('group');
    expect(bar?.getAttribute('aria-label')).toBe('Ações da prévia');
    expect(bar?.contains(nav)).toBe(true);
    expect(bar?.contains(edit)).toBe(true);
    expect(bar?.firstElementChild).toBe(nav);
    expect(bar?.lastElementChild).toBe(edit);
    expect(host.querySelectorAll('.timeline-preview__action-bar')).toHaveLength(
      1
    );
  });
});
