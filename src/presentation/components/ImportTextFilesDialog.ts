import { escapeHtml, formatDateFull } from '@shared/utilities/index.js';
import { el } from '../dom.js';
import { mountDialog } from './Dialog.js';
import {
  formatFileSize,
  type PreparedTextImport,
  type RejectedTextImport,
} from '../app/textFileImport.js';

export interface ImportTextFilesDialogOptions {
  chainTitle: string;
  valid: PreparedTextImport[];
  rejected: RejectedTextImport[];
  totalBytes: number;
  onConfirm: (useSourceDates: boolean) => Promise<
    { ok: true } | { ok: false; error: string }
  >;
}

let dialogSequence = 0;

function documentLabel(count: number): string {
  return `${count} ${count === 1 ? 'documento' : 'documentos'}`;
}

export function showImportTextFilesDialog(
  options: ImportTextFilesDialogOptions
): Promise<boolean> {
  return new Promise((resolve) => {
    const uid = ++dialogSequence;
    const titleId = `import-files-title-${uid}`;
    const descriptionId = `import-files-description-${uid}`;
    const listId = `import-files-list-${uid}`;
    const errorId = `import-files-error-${uid}`;
    const dateSwitchId = `import-files-date-${uid}`;
    const total = options.valid.length + options.rejected.length;
    const hasDates = options.valid.some((file) => file.sourceModifiedAt);

    const backdrop = el('div', 'dialog-backdrop');
    backdrop.setAttribute('role', 'presentation');

    const dialog = el('div', 'dialog dialog--wide import-dialog import-files-dialog');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', titleId);
    dialog.setAttribute('aria-describedby', `${descriptionId} ${errorId}`);

    const validSummary = `${options.valid.length} ${
      options.valid.length === 1 ? 'válido' : 'válidos'
    }`;
    const rejectedSummary = `${options.rejected.length} com falha`;
    const descriptionHtml =
      options.valid.length === 0
        ? `Nenhum documento válido para importar em <strong>${escapeHtml(options.chainTitle)}</strong>.`
        : `Adicionar ${validSummary} como ${
            options.valid.length === 1 ? 'nova nota' : 'novas notas'
          } em <strong>${escapeHtml(options.chainTitle)}</strong>.`;

    dialog.innerHTML = `
      <div class="dialog__header">
        <div>
          <h2 id="${titleId}" class="dialog__title dialog__title--left">
            Importar ${documentLabel(total)}
          </h2>
          <p id="${descriptionId}" class="dialog__body dialog__body--left">
            ${descriptionHtml}
          </p>
        </div>
        <button class="btn-icon" id="import-files-close-${uid}" type="button" aria-label="Fechar" title="Fechar">
          <span class="material-symbols-rounded" aria-hidden="true">close</span>
        </button>
      </div>

      <div class="import-batch-summary" aria-label="Resumo da importação">
        <span class="import-batch-summary__item">
          <span class="material-symbols-rounded" aria-hidden="true">description</span>
          ${documentLabel(total)}
        </span>
        <span class="import-batch-summary__item">
          <span class="material-symbols-rounded" aria-hidden="true">data_usage</span>
          ${escapeHtml(formatFileSize(options.totalBytes))}
        </span>
        <span class="import-batch-summary__item import-batch-summary__item--ok">
          <span class="material-symbols-rounded" aria-hidden="true">check_circle</span>
          ${escapeHtml(validSummary)}
        </span>
        ${
          options.rejected.length > 0
            ? `<span class="import-batch-summary__item import-batch-summary__item--error">
                <span class="material-symbols-rounded" aria-hidden="true">error</span>
                ${escapeHtml(rejectedSummary)}
              </span>`
            : ''
        }
      </div>

      ${
        hasDates
          ? `
        <div class="import-dialog__date-option">
          <label class="md-switch" for="${dateSwitchId}">
            <input class="md-switch__input" id="${dateSwitchId}" type="checkbox" role="switch" checked />
            <span class="md-switch__track" aria-hidden="true"><span class="md-switch__thumb"></span></span>
            <span class="md-switch__label">Usar datas dos arquivos</span>
          </label>
          <p class="import-dialog__support">
            Cada nota será anexada ao final da coleção, mas aparecerá no histórico e na timeline na data do respectivo arquivo.
          </p>
        </div>
      `
          : ''
      }

      <div class="import-batch-list" id="${listId}" role="list" aria-label="Documentos selecionados"></div>
      <p class="import-dialog__error" id="${errorId}" role="alert"></p>

      <div class="dialog__actions">
        <button class="btn btn-text" id="import-files-cancel-${uid}" type="button" data-autofocus>Cancelar</button>
        <button class="btn btn-filled" id="import-files-confirm-${uid}" type="button" ${
          options.valid.length === 0 ? 'disabled' : ''
        }>
          <span class="material-symbols-rounded" aria-hidden="true">upload_file</span>
          <span id="import-files-confirm-label-${uid}">Importar ${documentLabel(options.valid.length)}</span>
        </button>
      </div>
    `;

    const list = dialog.querySelector<HTMLElement>(`#${listId}`)!;
    const cancel = dialog.querySelector<HTMLButtonElement>(`#import-files-cancel-${uid}`)!;
    const close = dialog.querySelector<HTMLButtonElement>(`#import-files-close-${uid}`)!;
    const confirm = dialog.querySelector<HTMLButtonElement>(`#import-files-confirm-${uid}`)!;
    const confirmLabel = dialog.querySelector<HTMLElement>(`#import-files-confirm-label-${uid}`)!;
    const error = dialog.querySelector<HTMLElement>(`#${errorId}`)!;
    const dateSwitch = dialog.querySelector<HTMLInputElement>(`#${dateSwitchId}`);

    let importing = false;
    let settled = false;
    let destroy = (): void => {};
    let expanded: { button: HTMLButtonElement; panel: HTMLElement; content: HTMLElement } | null =
      null;
    const validStatuses: HTMLElement[] = [];

    const closeExpanded = (): void => {
      if (!expanded) return;
      expanded.button.setAttribute('aria-expanded', 'false');
      expanded.button.textContent = 'Ver conteúdo completo';
      expanded.panel.hidden = true;
      expanded.content.textContent = '';
      expanded = null;
    };

    const metaText = (file: PreparedTextImport): string => {
      const date = file.sourceModifiedAt
        ? formatDateFull(file.sourceModifiedAt)
        : 'Sem data nos metadados';
      return `${formatFileSize(file.byteSize)} · ${date}`;
    };

    options.valid.forEach((file, index) => {
      const item = el('article', 'import-batch-item');
      item.setAttribute('role', 'listitem');

      const header = el('div', 'import-batch-item__header');
      const status = el('span', 'import-batch-item__status import-batch-item__status--ok');
      status.innerHTML =
        '<span class="material-symbols-rounded" aria-hidden="true">check_circle</span> Pronto';
      validStatuses.push(status);

      const info = el('div', 'import-batch-item__info');
      const name = el('span', 'import-batch-item__name');
      name.textContent = file.fileName;
      const meta = el('span', 'import-batch-item__meta');
      meta.textContent = metaText(file);
      info.append(name, meta);
      header.append(status, info);
      item.appendChild(header);

      const head = el('pre', 'import-batch-item__head');
      head.textContent = file.head ?? file.preview;
      item.appendChild(head);

      if (file.hasMoreLines ?? false) {
        const panelId = `import-files-content-${uid}-${index}`;
        const button = el('button', 'btn btn-text import-batch-item__expand');
        button.type = 'button';
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('aria-controls', panelId);
        button.textContent = 'Ver conteúdo completo';

        const panel = el('div', 'import-batch-item__full');
        panel.id = panelId;
        panel.hidden = true;
        const content = el('pre', 'import-batch-item__full-text');
        panel.appendChild(content);

        button.addEventListener('click', () => {
          if (expanded?.button === button) {
            closeExpanded();
            return;
          }
          closeExpanded();
          button.setAttribute('aria-expanded', 'true');
          button.textContent = 'Recolher conteúdo';
          content.textContent = file.content;
          panel.hidden = false;
          expanded = { button, panel, content };
        });

        item.append(button, panel);
      }

      list.appendChild(item);
    });

    options.rejected.forEach((file) => {
      const item = el('article', 'import-batch-item import-batch-item--error');
      item.setAttribute('role', 'listitem');

      const header = el('div', 'import-batch-item__header');
      const status = el('span', 'import-batch-item__status import-batch-item__status--error');
      status.innerHTML =
        '<span class="material-symbols-rounded" aria-hidden="true">error</span> Falha';

      const info = el('div', 'import-batch-item__info');
      const name = el('span', 'import-batch-item__name');
      name.textContent = file.fileName;
      const meta = el('span', 'import-batch-item__meta');
      meta.textContent = formatFileSize(file.byteSize);
      info.append(name, meta);
      header.append(status, info);
      item.appendChild(header);

      const failure = el('p', 'import-batch-item__failure');
      failure.textContent = file.error;
      item.appendChild(failure);
      list.appendChild(item);
    });

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
      confirm.disabled = busy || options.valid.length === 0;
      if (dateSwitch) dateSwitch.disabled = busy;
      dialog.querySelectorAll<HTMLButtonElement>('.import-batch-item__expand').forEach((item) => {
        item.disabled = busy;
      });
      confirmLabel.textContent = busy
        ? 'Importando...'
        : `Importar ${documentLabel(options.valid.length)}`;
    };

    const resetStatuses = (): void => {
      validStatuses.forEach((status) => {
        status.classList.remove('import-batch-item__status--error');
        status.classList.add('import-batch-item__status--ok');
        status.innerHTML =
          '<span class="material-symbols-rounded" aria-hidden="true">check_circle</span> Pronto';
      });
    };

    const markFailed = (): void => {
      validStatuses.forEach((status) => {
        status.classList.remove('import-batch-item__status--ok');
        status.classList.add('import-batch-item__status--error');
        status.innerHTML =
          '<span class="material-symbols-rounded" aria-hidden="true">error</span> Falha';
      });
    };

    const submit = async (): Promise<void> => {
      if (importing || options.valid.length === 0) return;
      setBusy(true);
      error.textContent = '';
      resetStatuses();

      try {
        const result = await options.onConfirm(Boolean(dateSwitch?.checked));
        if (result.ok) {
          finish(true);
          return;
        }
        error.textContent = result.error;
        markFailed();
      } catch (submitError: unknown) {
        error.textContent =
          submitError instanceof Error
            ? submitError.message
            : 'Não foi possível importar os documentos.';
        markFailed();
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
