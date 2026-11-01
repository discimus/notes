import { escapeHtml, formatDateFull } from '@shared/utilities/index.js';
import { el } from '../dom.js';
import { mountDialog } from './Dialog.js';
import { formatFileSize } from '../app/textFileImport.js';
import type { ISODateString } from '@shared/types/index.js';

export interface ImportTextDialogOptions {
  chainTitle: string;
  fileName: string;
  byteSize: number;
  sourceModifiedAt?: ISODateString | undefined;
  preview: string;
  characterCount: number;
  truncated: boolean;
  onConfirm: (useSourceDate: boolean) => Promise<
    { ok: true } | { ok: false; error: string }
  >;
}

let dialogSequence = 0;

export function showImportTextDialog(options: ImportTextDialogOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const uid = ++dialogSequence;
    const titleId = `import-dialog-title-${uid}`;
    const descriptionId = `import-dialog-description-${uid}`;
    const previewId = `import-dialog-preview-${uid}`;
    const errorId = `import-dialog-error-${uid}`;
    const dateSwitchId = `import-dialog-date-${uid}`;

    const backdrop = el('div', 'dialog-backdrop');
    backdrop.setAttribute('role', 'presentation');

    const dialog = el('div', 'dialog dialog--wide import-dialog');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', titleId);
    dialog.setAttribute('aria-describedby', `${descriptionId} ${previewId}`);

    const dateValue = options.sourceModifiedAt
      ? formatDateFull(options.sourceModifiedAt)
      : 'Não informada';
    const previewNote = options.truncated
      ? `Prévia parcial de ${options.characterCount.toLocaleString('pt-BR')} caracteres.`
      : `${options.characterCount.toLocaleString('pt-BR')} caracteres.`;

    dialog.innerHTML = `
      <div class="dialog__header">
        <div>
          <h2 id="${titleId}" class="dialog__title dialog__title--left">Importar documento</h2>
          <p id="${descriptionId}" class="dialog__body dialog__body--left">
            Adicionar como nova nota em <strong>${escapeHtml(options.chainTitle)}</strong>.
          </p>
        </div>
        <button class="btn-icon" id="import-close-${uid}" type="button" aria-label="Fechar" title="Fechar">
          <span class="material-symbols-rounded" aria-hidden="true">close</span>
        </button>
      </div>

      <div class="import-dialog__meta">
        <div class="import-dialog__meta-item">
          <span class="material-symbols-rounded import-dialog__meta-icon" aria-hidden="true">description</span>
          <span class="import-dialog__meta-text">
            <span class="import-dialog__meta-label">Documento</span>
            <span class="import-dialog__meta-value">${escapeHtml(options.fileName)}</span>
          </span>
        </div>
        <div class="import-dialog__meta-item">
          <span class="material-symbols-rounded import-dialog__meta-icon" aria-hidden="true">data_usage</span>
          <span class="import-dialog__meta-text">
            <span class="import-dialog__meta-label">Tamanho</span>
            <span class="import-dialog__meta-value">${escapeHtml(formatFileSize(options.byteSize))}</span>
          </span>
        </div>
        <div class="import-dialog__meta-item">
          <span class="material-symbols-rounded import-dialog__meta-icon" aria-hidden="true">calendar_today</span>
          <span class="import-dialog__meta-text">
            <span class="import-dialog__meta-label">Data do arquivo</span>
            <span class="import-dialog__meta-value">${escapeHtml(dateValue)}</span>
          </span>
        </div>
      </div>

      ${
        options.sourceModifiedAt
          ? `
        <div class="import-dialog__date-option">
          <label class="md-switch" for="${dateSwitchId}">
            <input class="md-switch__input" id="${dateSwitchId}" type="checkbox" role="switch" checked />
            <span class="md-switch__track" aria-hidden="true"><span class="md-switch__thumb"></span></span>
            <span class="md-switch__label">Usar data do arquivo</span>
          </label>
          <p class="import-dialog__support">
            A nota será anexada ao final da cadeia, mas aparecerá no histórico e na timeline na data do arquivo.
          </p>
        </div>
      `
          : ''
      }

      <div class="import-dialog__preview" id="${previewId}" role="region" aria-label="Prévia do conteúdo">
        <pre class="import-dialog__preview-text"></pre>
      </div>
      <p class="import-dialog__preview-note">${escapeHtml(previewNote)}</p>
      <p class="import-dialog__error" id="${errorId}" role="alert"></p>

      <div class="dialog__actions">
        <button class="btn btn-text" id="import-cancel-${uid}" type="button" data-autofocus>Cancelar</button>
        <button class="btn btn-filled" id="import-confirm-${uid}" type="button">
          <span class="material-symbols-rounded" aria-hidden="true">upload_file</span>
          <span id="import-confirm-label-${uid}">Importar como nota</span>
        </button>
      </div>
    `;

    const previewText = dialog.querySelector<HTMLElement>('.import-dialog__preview-text')!;
    previewText.textContent = options.preview;

    const cancel = dialog.querySelector<HTMLButtonElement>(`#import-cancel-${uid}`)!;
    const close = dialog.querySelector<HTMLButtonElement>(`#import-close-${uid}`)!;
    const confirm = dialog.querySelector<HTMLButtonElement>(`#import-confirm-${uid}`)!;
    const confirmLabel = dialog.querySelector<HTMLElement>(`#import-confirm-label-${uid}`)!;
    const error = dialog.querySelector<HTMLElement>(`#${errorId}`)!;
    const dateSwitch = dialog.querySelector<HTMLInputElement>(`#${dateSwitchId}`);

    let importing = false;
    let settled = false;
    let destroy = (): void => {};

    const finish = (result: boolean): void => {
      if (settled) return;
      settled = true;
      destroy();
      resolve(result);
    };

    const setBusy = (busy: boolean): void => {
      importing = busy;
      dialog.setAttribute('aria-busy', busy ? 'true' : 'false');
      cancel.disabled = busy;
      close.disabled = busy;
      confirm.disabled = busy;
      confirmLabel.textContent = busy ? 'Importando...' : 'Importar como nota';
    };

    const submit = async (): Promise<void> => {
      if (importing) return;
      setBusy(true);
      error.textContent = '';

      try {
        const result = await options.onConfirm(Boolean(dateSwitch?.checked));
        if (result.ok) {
          finish(true);
          return;
        }
        error.textContent = result.error;
      } catch (submitError: unknown) {
        error.textContent =
          submitError instanceof Error
            ? submitError.message
            : 'Não foi possível importar o documento.';
      }

      if (!settled) setBusy(false);
    };

    backdrop.appendChild(dialog);
    destroy = mountDialog(backdrop, dialog, () => finish(false), {
      canClose: () => !importing,
    });

    cancel.addEventListener('click', () => finish(false));
    close.addEventListener('click', () => finish(false));
    confirm.addEventListener('click', () => {
      void submit();
    });
  });
}
