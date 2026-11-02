import type { AppState } from '../state/AppState.js';
import type { TagDTO } from '@application/dto/index.js';
import { AppController } from '../pages/AppController.js';
import { showInputDialog } from '../components/Dialog.js';
import { showTagMenu } from '../components/TagMenu.js';
import { el, qs } from '../dom.js';
import { escapeHtml } from '@shared/utilities/index.js';
import { renderEmptyDetail } from '../components/states.js';
import { renderNavToggle } from '../components/NavToggle.js';

export function renderTagsLayout(state: AppState): HTMLElement {
  const layout = el('div', 'tags-layout');
  layout.setAttribute('id', 'tags-layout');
  renderTagsContent(layout, state);
  return layout;
}

export function updateTagsLayout(content: HTMLElement, state: AppState): void {
  const layout = qs('#tags-layout', content);
  if (layout) {
    layout.innerHTML = '';
    renderTagsContent(layout, state);
  }
}

function renderTagsContent(container: HTMLElement, state: AppState): void {
  const page = el('div', 'tags-page');
  const tags = [...state.allTags].sort((a, b) =>
    a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
  );

  const header = el('div', 'tags-header');
  header.appendChild(renderNavToggle());
  const heading = el('div', 'tags-header__heading');
  const title = el('h1', 'tags-header__title');
  title.textContent = 'Tags';
  const subtitle = el('p', 'tags-header__subtitle');
  subtitle.textContent = `${tags.length} ${tags.length === 1 ? 'tag' : 'tags'}`;
  heading.append(title, subtitle);
  header.appendChild(heading);
  page.appendChild(header);

  if (tags.length === 0) {
    page.appendChild(
      renderEmptyDetail(
        'label_off',
        'Nenhuma tag ainda',
        'Tags são criadas ao associá-las a cadeias ou notas no editor.'
      )
    );
    container.appendChild(page);
    return;
  }

  const list = el('div', 'tags-list');
  list.setAttribute('role', 'list');
  list.setAttribute('aria-label', 'Tags');

  tags.forEach((tag) => {
    list.appendChild(renderTagRow(tag));
  });

  page.appendChild(list);
  container.appendChild(page);
}

function renderTagRow(tag: TagDTO): HTMLElement {
  const row = el('div', 'tag-row');
  row.setAttribute('role', 'listitem');
  row.dataset['tagId'] = tag.id;

  row.innerHTML = `
    <span class="material-symbols-rounded tag-row__icon" aria-hidden="true">label</span>
    <span class="tag-row__name">${escapeHtml(tag.name)}</span>
    <span class="tag-row__count">${tag.chainCount} ${tag.chainCount === 1 ? 'cadeia' : 'cadeias'}</span>
  `;

  const menuButton = el('button', 'btn-icon tag-row__menu');
  menuButton.type = 'button';
  menuButton.setAttribute('aria-label', `Ações da tag ${tag.name}`);
  menuButton.setAttribute('aria-haspopup', 'menu');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.innerHTML =
    '<span class="material-symbols-rounded" aria-hidden="true">more_vert</span>';
  menuButton.addEventListener('click', (event) => {
    showTagMenu(event, tag.name, {
      onRename: () => renameTag(tag),
      onDelete: () => void AppController.deleteTagById(tag.id),
    });
  });
  row.appendChild(menuButton);

  return row;
}

async function renameTag(tag: TagDTO): Promise<void> {
  const newName = await showInputDialog({
    title: 'Renomear tag',
    label: 'Novo nome',
    initialValue: tag.name,
  });
  if (newName) void AppController.renameTag(tag.id, newName);
}
