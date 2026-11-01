import { el } from '../dom.js';
import { getSettings, setSettings } from '../app/settings.js';
import {
  getFullNoteContent,
  setFullNoteContent,
} from '../app/noteContentDisplay.js';
import {
  getNoteImageLayout,
  setNoteImageLayout,
  type NoteImageLayout,
} from '../app/noteImageLayout.js';
import { mountDialog } from './Dialog.js';

const DIALOG_ID = 'settings-dialog';

export function showSettingsDialog(): void {
  if (document.getElementById(DIALOG_ID)) return;

  const settings = getSettings();

  const backdrop = el('div', 'dialog-backdrop');
  backdrop.setAttribute('role', 'presentation');

  const dialog = el('div', 'dialog dialog--settings');
  dialog.id = DIALOG_ID;
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'settings-title');
  dialog.setAttribute('aria-describedby', 'settings-description');

  dialog.innerHTML = `
    <div class="dialog__header">
      <div>
        <h2 id="settings-title" class="dialog__title dialog__title--left">Configurações</h2>
        <p id="settings-description" class="dialog__body dialog__body--left">Preferências deste dispositivo.</p>
      </div>
      <button class="btn-icon" id="settings-close" type="button" aria-label="Fechar configurações" title="Fechar">
        <span class="material-symbols-rounded" aria-hidden="true">close</span>
      </button>
    </div>
    <section class="settings-section" aria-labelledby="settings-delete-title">
      <h3 id="settings-delete-title" class="settings-section__title">Exclusão</h3>
      <label class="settings-row" for="settings-confirm-trash">
        <input
          type="checkbox"
          id="settings-confirm-trash"
          class="settings-checkbox"
          aria-describedby="settings-confirm-trash-support"
          data-autofocus
        />
        <span class="settings-row__text">
          <span class="settings-row__label">Confirmar antes de excluir</span>
          <span id="settings-confirm-trash-support" class="settings-row__support">
            Pede confirmação ao mover uma cadeia para a lixeira. A exclusão permanente continua exigindo confirmação.
          </span>
        </span>
      </label>
    </section>
    <section class="settings-section" aria-labelledby="settings-notes-title">
      <h3 id="settings-notes-title" class="settings-section__title">Notas</h3>
      <label class="settings-row" for="settings-full-note-content">
        <input
          type="checkbox"
          id="settings-full-note-content"
          class="settings-checkbox"
          aria-describedby="settings-full-note-content-support"
        />
        <span class="settings-row__text">
          <span class="settings-row__label">Mostrar conteúdo completo das notas</span>
          <span id="settings-full-note-content-support" class="settings-row__support">
            Exibe todo o conteúdo no histórico da cadeia. Quando desativado, o texto é limitado a 3 linhas e o código a 4 linhas.
          </span>
        </span>
      </label>
    </section>
    <section class="settings-section" aria-labelledby="settings-images-title">
      <h3 id="settings-images-title" class="settings-section__title">Imagens</h3>
      <fieldset class="settings-choice" aria-describedby="settings-image-layout-support">
        <legend class="settings-choice__legend">Layout das imagens</legend>
        <label class="settings-row" for="settings-image-layout-thumbnails">
          <input
            type="radio"
            id="settings-image-layout-thumbnails"
            name="settings-image-layout"
            value="thumbnails"
            class="settings-checkbox"
          />
          <span class="settings-row__text">
            <span class="settings-row__label">Miniaturas</span>
            <span class="settings-row__support">Miniaturas em grade, com dimensões fixas.</span>
          </span>
        </label>
        <label class="settings-row" for="settings-image-layout-column">
          <input
            type="radio"
            id="settings-image-layout-column"
            name="settings-image-layout"
            value="column"
            class="settings-checkbox"
          />
          <span class="settings-row__text">
            <span class="settings-row__label">Largura da nota</span>
            <span class="settings-row__support">Uma imagem por linha, até a largura da coluna.</span>
          </span>
        </label>
      </fieldset>
      <p id="settings-image-layout-support" class="settings-row__support">
        Miniaturas preservam o layout atual. A largura da nota exibe imagens maiores, sem recorte.
      </p>
    </section>
    <p class="settings-status" id="settings-status" aria-live="polite"></p>
    <div class="dialog__actions">
      <button class="btn btn-text" id="settings-done" type="button">Fechar</button>
    </div>
  `;

  const checkbox = dialog.querySelector<HTMLInputElement>('#settings-confirm-trash')!;
  const fullNoteContent = dialog.querySelector<HTMLInputElement>(
    '#settings-full-note-content'
  )!;
  const imageLayoutInputs = [
    ...dialog.querySelectorAll<HTMLInputElement>(
      'input[name="settings-image-layout"]'
    ),
  ];
  const status = dialog.querySelector<HTMLParagraphElement>('#settings-status')!;
  checkbox.checked = settings.confirmBeforeTrash;
  fullNoteContent.checked = getFullNoteContent();
  const imageLayout = getNoteImageLayout();
  imageLayoutInputs.forEach((input) => {
    input.checked = input.value === imageLayout;
  });

  checkbox.addEventListener('change', () => {
    setSettings({ confirmBeforeTrash: checkbox.checked });
    status.textContent = checkbox.checked
      ? 'Confirmação ativada.'
      : 'Confirmação desativada.';
  });

  fullNoteContent.addEventListener('change', () => {
    setFullNoteContent(fullNoteContent.checked);
    status.textContent = fullNoteContent.checked
      ? 'Conteúdo completo ativado.'
      : 'Conteúdo completo desativado.';
  });

  imageLayoutInputs.forEach((input) => {
    input.addEventListener('change', () => {
      if (!input.checked) return;
      const layout: NoteImageLayout =
        input.value === 'column' ? 'column' : 'thumbnails';
      setNoteImageLayout(layout);
      status.textContent =
        layout === 'column'
          ? 'Imagens na largura da nota ativadas.'
          : 'Miniaturas de imagens ativadas.';
    });
  });

  backdrop.appendChild(dialog);

  let destroy = () => {};
  const finish = () => destroy();
  destroy = mountDialog(backdrop, dialog, finish);

  dialog.querySelector('#settings-close')!.addEventListener('click', finish);
  dialog.querySelector('#settings-done')!.addEventListener('click', finish);
}
