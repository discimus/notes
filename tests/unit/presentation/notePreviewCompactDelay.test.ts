import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

function render(host: HTMLElement): HTMLElement {
  renderNotePreview(
    host,
    {
      chainId: 'chain-1',
      chainTitle: 'Projeto',
      note: note('note-1'),
    },
    {
      navigation: {
        hasPrevious: true,
        hasNext: true,
        onPrevious: vi.fn(),
        onNext: vi.fn(),
      },
    }
  );
  const scroll = host.querySelector<HTMLElement>('.timeline-preview__scroll');
  if (!scroll) throw new Error('Scroll da previa nao encontrado');
  return scroll;
}

describe('NotePreview - delay universal do resize por scroll', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      return window.setTimeout(() => callback(0), 0) as unknown as number;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('compacta e expande somente apos 120ms', () => {
    const host = document.createElement('aside');
    document.body.appendChild(host);
    const scroll = render(host);
    const compactClass = 'timeline-preview--actions-compact';

    scroll.scrollTop = 200;
    scroll.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(0);
    expect(host.classList.contains(compactClass)).toBe(false);

    vi.advanceTimersByTime(119);
    expect(host.classList.contains(compactClass)).toBe(false);
    vi.advanceTimersByTime(1);
    expect(host.classList.contains(compactClass)).toBe(true);

    scroll.scrollTop = 100;
    scroll.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(0);
    expect(host.classList.contains(compactClass)).toBe(true);

    vi.advanceTimersByTime(119);
    expect(host.classList.contains(compactClass)).toBe(true);
    vi.advanceTimersByTime(1);
    expect(host.classList.contains(compactClass)).toBe(false);
  });

  it('expande imediatamente ao voltar ao topo', () => {
    const host = document.createElement('aside');
    document.body.appendChild(host);
    const scroll = render(host);
    const compactClass = 'timeline-preview--actions-compact';

    scroll.scrollTop = 200;
    scroll.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(120);
    expect(host.classList.contains(compactClass)).toBe(true);

    scroll.scrollTop = 0;
    scroll.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(0);
    expect(host.classList.contains(compactClass)).toBe(false);
  });
});
