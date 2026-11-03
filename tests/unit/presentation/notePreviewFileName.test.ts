import { afterEach, describe, expect, it } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import { renderNotePreview } from '@presentation/components/NotePreview.js';

function note(overrides: Partial<NoteDTO> = {}): NoteDTO {
  return {
    id: 'note-1',
    content: 'Conteudo',
    chainId: 'chain-1',
    position: 1,
    role: 'tail',
    createdAt: '2026-01-02T10:00:00.000Z',
    updatedAt: '2026-01-02T10:00:00.000Z',
    ...overrides,
  };
}

describe('NotePreview - nome do arquivo', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('mostra o nome do arquivo com icone discreto', () => {
    const host = document.createElement('aside');
    document.body.appendChild(host);

    renderNotePreview(host, {
      chainId: 'chain-1',
      chainTitle: 'Projeto',
      note: note({ sourceFileName: '  anotacoes.md  ' }),
    });

    const file = host.querySelector<HTMLElement>('.timeline-preview__file');
    expect(file?.title).toBe('anotacoes.md');
    expect(
      file?.querySelector('.timeline-preview__file-name')?.textContent
    ).toBe('anotacoes.md');

    const icon = file?.querySelector('.timeline-preview__file-icon');
    expect(icon?.textContent).toBe('description');
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
  });

  it('nao renderiza o nome quando a nota nao tem arquivo de origem', () => {
    const host = document.createElement('aside');
    document.body.appendChild(host);

    renderNotePreview(host, {
      chainId: 'chain-1',
      chainTitle: 'Projeto',
      note: note(),
    });

    expect(host.querySelector('.timeline-preview__file')).toBeNull();
  });
});
