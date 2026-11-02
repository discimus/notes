import { beforeEach, describe, expect, it } from 'vitest';
import type { TagDTO } from '@application/dto/index.js';
import { appState } from '@presentation/state/AppState.js';
import { renderTagsLayout } from '@presentation/views/tags.js';

function tag(id: string, name: string, chainCount: number): TagDTO {
  return {
    id,
    name,
    normalizedName: name.toLowerCase(),
    createdAt: '2026-01-01T00:00:00.000Z',
    origin: 'manual',
    chainCount,
  };
}

describe('Tags view', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renderiza lista enxuta, título e contagem', () => {
    appState.set({
      view: 'tags',
      allTags: [
        tag('tag-2', 'estudos', 1),
        tag('tag-1', 'Arquivo', 3),
      ],
    });

    const layout = renderTagsLayout(appState.get());
    document.body.appendChild(layout);

    expect(layout.querySelector('.tags-header > .nav-toggle')).not.toBeNull();
    expect(layout.querySelector('.tags-header__title')?.textContent).toBe('Tags');
    expect(layout.querySelector('.tags-header__subtitle')?.textContent).toBe(
      '2 tags'
    );
    expect(layout.querySelectorAll('.tag-row')).toHaveLength(2);
    expect(layout.querySelector('.tag-card')).toBeNull();
    expect(
      [...layout.querySelectorAll('.tag-row__name')].map(
        (item) => item.textContent
      )
    ).toEqual(['Arquivo', 'estudos']);
    expect(layout.querySelector('.tag-row__count')?.textContent).toBe(
      '3 cadeias'
    );
  });

  it('singulariza a contagem e mantém o estado vazio', () => {
    appState.set({
      view: 'tags',
      allTags: [tag('tag-1', 'foco', 1)],
    });
    const layout = renderTagsLayout(appState.get());

    expect(layout.querySelector('.tag-row__count')?.textContent).toBe(
      '1 cadeia'
    );

    appState.set({ allTags: [] });
    const empty = renderTagsLayout(appState.get());
    expect(empty.querySelector('.tags-header__subtitle')?.textContent).toBe(
      '0 tags'
    );
    expect(empty.textContent).toContain('Nenhuma tag ainda');
  });
});
