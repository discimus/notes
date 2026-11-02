import { el } from '../dom.js';
import { mountDialog } from './Dialog.js';

const DIALOG_ID = 'shortcuts-dialog';

const SHORTCUTS: ReadonlyArray<{ keys: readonly string[]; label: string }> = [
  { keys: ['N'], label: 'Novo documento em branco' },
  { keys: ['Shift', 'N'], label: 'Nova coleção' },
  { keys: ['Ctrl', 'K'], label: 'Pesquisar' },
  { keys: ['Ctrl', 'S'], label: 'Salvar documento ou nota' },
  { keys: ['Ctrl', 'Enter'], label: 'Salvar nota e fechar o editor' },
  { keys: ['Esc'], label: 'Fechar diálogo, nota ou sair da pesquisa' },
];

export function showShortcutsDialog(): void {
  if (document.getElementById(DIALOG_ID)) return;

  const backdrop = el('div', 'dialog-backdrop');
  backdrop.setAttribute('role', 'presentation');

  const dialog = el('div', 'dialog dialog--shortcuts');
  dialog.id = DIALOG_ID;
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'shortcuts-title');
  dialog.setAttribute('aria-describedby', 'shortcuts-description');

  dialog.innerHTML = `
    <header class="shortcuts-dialog__header">
      <div class="shortcuts-dialog__heading">
        <span class="shortcuts-dialog__icon material-symbols-rounded" aria-hidden="true">keyboard</span>
        <div>
          <h2 id="shortcuts-title" class="shortcuts-dialog__title">Atalhos de teclado</h2>
          <p id="shortcuts-description" class="shortcuts-dialog__description">
            Ações rápidas disponíveis no Notes.
          </p>
        </div>
      </div>
      <button class="btn-icon" id="shortcuts-close" type="button" aria-label="Fechar atalhos" title="Fechar">
        <span class="material-symbols-rounded" aria-hidden="true">close</span>
      </button>
    </header>
    <div class="shortcuts-dialog__body"></div>
    <footer class="shortcuts-dialog__footer">
      <button class="btn btn-text" id="shortcuts-done" type="button" data-autofocus>Fechar</button>
    </footer>
  `;

  const body = dialog.querySelector<HTMLElement>('.shortcuts-dialog__body')!;
  const list = el('ul', 'shortcuts-list');

  SHORTCUTS.forEach(({ keys, label }) => {
    const item = el('li', 'shortcuts-list__item');
    const keyGroup = el('span', 'shortcuts-list__keys');

    keys.forEach((key) => {
      const kbd = el('kbd', 'shortcut-key');
      kbd.textContent = key;
      keyGroup.appendChild(kbd);
    });

    const description = el('span', 'shortcuts-list__label');
    description.textContent = label;
    item.append(keyGroup, description);
    list.appendChild(item);
  });

  const hint = el('p', 'shortcuts-dialog__hint');
  hint.textContent = 'No macOS, use ⌘ no lugar de Ctrl.';
  body.append(list, hint);

  backdrop.appendChild(dialog);

  let destroy = (): void => {};
  const finish = (): void => destroy();
  destroy = mountDialog(backdrop, dialog, finish);

  dialog.querySelector('#shortcuts-close')!.addEventListener('click', finish);
  dialog.querySelector('#shortcuts-done')!.addEventListener('click', finish);
}
