import type { AppState } from '../state/AppState.js';
import { AppController } from '../pages/AppController.js';
import { showInputDialog } from '../components/Dialog.js';
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
  const header = el('div', 'tags-header');
  header.appendChild(renderNavToggle());
  container.appendChild(header);

  if (state.allTags.length === 0) {
    container.appendChild(renderEmptyDetail('label_off', 'Nenhuma tag ainda', 'Tags são criadas ao associá-las a cadeias ou notas no editor.'));
    return;
  }

  const grid = el('div', 'tags-grid');

  state.allTags.forEach((tag) => {
    const card = el('div', 'tag-card card card--outlined');

    card.innerHTML = `
      <span class="material-symbols-rounded tag-card__icon" aria-hidden="true">label</span>
      <div class="tag-card__content">
        <p class="tag-card__name">${escapeHtml(tag.name)}</p>
        <p class="tag-card__count">${tag.chainCount} cadeia${tag.chainCount !== 1 ? 's' : ''}</p>
      </div>
    `;

    const actionsDiv = el('div', 'tag-card__actions');

    const editBtn = el('button', 'btn-icon');
    editBtn.setAttribute('aria-label', `Renomear tag ${tag.name}`);
    editBtn.setAttribute('title', 'Renomear');
    editBtn.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">edit</span>';
    editBtn.addEventListener('click', async () => {
      const newName = await showInputDialog({
        title: 'Renomear tag',
        label: 'Novo nome',
        initialValue: tag.name,
      });
      if (newName) AppController.renameTag(tag.id, newName);
    });

    const deleteBtn = el('button', 'btn-icon tag-card__delete');
    deleteBtn.setAttribute('aria-label', `Excluir tag ${tag.name}`);
    deleteBtn.setAttribute('title', 'Excluir');
    deleteBtn.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">delete</span>';
    deleteBtn.addEventListener('click', () => AppController.deleteTagById(tag.id));

    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(deleteBtn);
    card.appendChild(actionsDiv);

    grid.appendChild(card);
  });

  container.appendChild(grid);
}
