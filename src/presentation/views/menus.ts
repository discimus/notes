import { AppController } from '../pages/AppController.js';
import { mountDialog, showInputDialog } from '../components/Dialog.js';
import { el, qs } from '../dom.js';
import { escapeHtml } from '@shared/utilities/index.js';

export function showChainMenu(e: MouseEvent, chainId: string): void {
  const existing = qs('#chain-menu');
  existing?.remove();

  const menu = el('div', 'chain-menu');
  menu.id = 'chain-menu';

  const btn = e.currentTarget as HTMLElement;
  const rect = btn.getBoundingClientRect();

  menu.style.top = `${rect.bottom + 4}px`;
  menu.style.right = `${window.innerWidth - rect.right}px`;

  const items: Array<{ icon: string; label: string; action: () => void; danger?: boolean }> = [
    {
      icon: 'archive',
      label: 'Arquivar',
      action: () => AppController.archiveChain(chainId),
    },
    {
      icon: 'delete',
      label: 'Mover para lixeira',
      action: () => AppController.deleteChain(chainId),
      danger: true,
    },
  ];

  items.forEach(({ icon, label, action, danger }) => {
    const item = el('button', `chain-menu__item${danger ? ' chain-menu__item--danger' : ''}`);
    item.innerHTML = `<span class="material-symbols-rounded icon-lg" aria-hidden="true">${escapeHtml(icon)}</span>${escapeHtml(label)}`;
    item.addEventListener('click', () => { menu.remove(); action(); });
    menu.appendChild(item);
  });

  document.body.appendChild(menu);

  setTimeout(() => {
    document.addEventListener('click', () => menu.remove(), { once: true });
  }, 0);
}

export function showComposerModal(): void {
  const backdrop = el('div', 'dialog-backdrop');
  backdrop.setAttribute('role', 'presentation');

  const dialog = el('div', 'dialog dialog--wide');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'modal-title');

  dialog.innerHTML = `
    <h2 id="modal-title" class="dialog__title dialog__title--left">Nova cadeia</h2>
    <div class="text-field text-field--outlined form-field--spaced">
      <div class="text-field__container">
        <input type="text" class="text-field__input" id="modal-title-input"
          placeholder=" " autocomplete="off" aria-label="Título opcional" />
        <label class="text-field__label" for="modal-title-input">Título (opcional)</label>
      </div>
    </div>
    <div class="text-field text-field--textarea text-field--outlined">
      <div class="text-field__container">
        <textarea class="text-field__input" id="modal-content-input"
          placeholder=" " rows="5" aria-label="Conteúdo da nota" required data-autofocus></textarea>
        <label class="text-field__label" for="modal-content-input">Conteúdo *</label>
      </div>
    </div>
    <div id="modal-tags-row" class="modal-tags-row">
      <span class="modal-tags-label">Tags:</span>
    </div>
    <div class="dialog__actions">
      <button class="btn btn-text" id="modal-cancel">Cancelar</button>
      <button class="btn btn-filled" id="modal-save">
        <span class="material-symbols-rounded" aria-hidden="true">add</span> Criar cadeia
      </button>
    </div>
  `;

  const tags: string[] = [];
  const tagsRow = dialog.querySelector('#modal-tags-row')!;

  const addTagChip = (name: string) => {
    const chip = el('span', 'chip chip--selected chip--sm');
    const label = document.createElement('span');
    label.textContent = name;
    const rm = el('button', 'chip__remove');
    rm.setAttribute('aria-label', `Remover tag ${name}`);
    rm.innerHTML = '<span class="material-symbols-rounded icon-xs">close</span>';
    rm.addEventListener('click', () => {
      const idx = tags.indexOf(name);
      if (idx > -1) tags.splice(idx, 1);
      chip.remove();
    });
    chip.appendChild(label);
    chip.appendChild(rm);
    tagsRow.appendChild(chip);
  };

  const addTagBtn = el('button', 'chip chip--sm');
  addTagBtn.innerHTML = '<span class="material-symbols-rounded icon-sm">add</span> tag';
  addTagBtn.addEventListener('click', async () => {
    const name = await showInputDialog({ title: 'Adicionar tag', label: 'Nome da tag' });
    if (name && !tags.includes(name)) {
      tags.push(name);
      addTagChip(name);
    }
  });
  tagsRow.appendChild(addTagBtn);

  const titleInput = dialog.querySelector<HTMLInputElement>('#modal-title-input')!;
  const contentInput = dialog.querySelector<HTMLTextAreaElement>('#modal-content-input')!;

  let destroy = () => {};
  const finish = () => destroy();

  backdrop.appendChild(dialog);
  destroy = mountDialog(backdrop, dialog, finish);

  dialog.querySelector('#modal-cancel')!.addEventListener('click', finish);

  dialog.querySelector('#modal-save')!.addEventListener('click', async () => {
    const content = contentInput.value.trim();
    if (!content) {
      contentInput.focus();
      return;
    }
    finish();
    await AppController.createChain(content, titleInput.value.trim() || undefined, tags);
  });
}
