import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import { renderNotePreview } from '@presentation/components/NotePreview.js';

function note(id: string): NoteDTO {
  return {
    id,
    content: 'Conteudo da nota',
    chainId: 'chain-1',
    position: 1,
    role: 'tail',
    createdAt: '2026-01-02T10:00:00.000Z',
    updatedAt: '2026-01-02T10:00:00.000Z',
  };
}

function render(host: HTMLElement, onEdit = vi.fn()): void {
  renderNotePreview(
    host,
    {
      chainId: 'chain-1',
      chainTitle: 'Projeto',
      note: note('note-1'),
    },
    {
      onClose: vi.fn(),
      action: {
        label: 'Editar nota',
        icon: 'edit',
        variant: 'fab',
        onClick: onEdit,
      },
      navigation: {
        hasPrevious: true,
        hasNext: true,
        onPrevious: vi.fn(),
        onNext: vi.fn(),
      },
    }
  );
}

describe('NotePreview - shell fixa e redimensionavel', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 0;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('mantem conteudo rolavel separado do rodape e do FAB', () => {
    const host = document.createElement('aside');
    document.body.appendChild(host);
    const onEdit = vi.fn();
    render(host, onEdit);

    const scroll = host.querySelector<HTMLElement>(
      '.timeline-preview__scroll'
    );
    const footer = host.querySelector<HTMLElement>(
      '.timeline-preview__footer'
    );
    const nav = host.querySelector<HTMLElement>('.timeline-preview__note-nav');
    const fab = host.querySelector<HTMLButtonElement>(
      '.timeline-preview__actions--fab .timeline-preview__fab'
    );

    expect(scroll).not.toBeNull();
    expect(footer).not.toBeNull();
    expect(scroll?.contains(footer)).toBe(false);
    expect(footer?.contains(nav)).toBe(true);
    expect(footer?.contains(fab)).toBe(true);
    expect(host.classList.contains('timeline-preview--with-fab')).toBe(true);

    fab?.click();
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('compacta ao rolar para baixo e expande ao voltar ao topo', () => {
    const host = document.createElement('aside');
    document.body.appendChild(host);
    render(host);

    const scroll = host.querySelector<HTMLElement>(
      '.timeline-preview__scroll'
    )!;

    scroll.scrollTop = 80;
    scroll.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(120);
    expect(host.classList.contains('timeline-preview--actions-compact')).toBe(
      true
    );

    scroll.scrollTop = 0;
    scroll.dispatchEvent(new Event('scroll'));
    expect(host.classList.contains('timeline-preview--actions-compact')).toBe(
      false
    );
  });
});
