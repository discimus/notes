import { escapeHtml } from '@shared/utilities/index.js';
import { el } from '../dom.js';
import { mountDialog } from './Dialog.js';
import { formatFileSize, type TextImportItem } from '../app/textFileImport.js';
import type {
  TextImportQueueResult,
  TextImportQueueSnapshot,
} from '../app/textImportQueue.js';

export interface ImportTextQueueDialogOptions {
  chainTitle: string;
  items: TextImportItem[];
  run: (
    useSourceDates: boolean,
    onProgress: (snapshot: TextImportQueueSnapshot) => void
  ) => Promise<TextImportQueueResult>;
}

interface StatusPresentation {
  label: string;
  icon: string;
  className: string;
}

const STATUS: Record<TextImportItem['status'], StatusPresentation> = {
  pending: { label: 'Pendente', icon: 'schedule', className: 'import-batch-item__status--pending' },
  processing: {
    label: 'Processando',
    icon: 'progress_activity',
    className: 'import-batch-item__status--pending',
  },
  imported: { label: 'Importado', icon: 'check_circle', className: 'import-batch-item__status--ok' },
  failed: { label: 'Falha', icon: 'error', className: 'import-batch-item__status--error' },
  duplicate: {
    label: 'Ignorado',
    icon: 'content_copy',
    className: 'import-batch-item__status--pending',
  },
};

let dialogSequence = 0;

function documentLabel(count: number): string {
  return `${count} ${count === 1 ? 'documento' : 'documentos'}`;
}

function hasSourceDates(items: readonly TextImportItem[]): boolean {
  const now = Date.now();
  return items.some((item) => {
    const timestamp = item.file.lastModified;
    return Number.isFinite(timestamp) && timestamp > 0 && timestamp <= now;
  });
}

export function showImportTextQueueDialog(
  options: ImportTextQueueDialogOptions
): Promise<boolean> {
  return new Promise((resolve) => {
    const uid = ++dialogSequence;
    const titleId = `import-queue-title-${uid}`;
    const descriptionId = `import-queue-description-${uid}`;
    const listId = `import-queue-list-${uid}`;
    const errorId = `import-queue-error-${uid}`;
    const dateSwitchId = `import-queue-date-${uid}`;
    const progressId = `import-queue-progress-${uid}`;
    const progressLabelId = `import-queue-progress-label-${uid}`;
    const storageNoteId = `import-queue-storage-${uid}`;

    const total = options.items.length;
    const initialPending = options.items.filter((item) => item.status === 'pending').length;
    const totalBytes = options.items.reduce((sum, item) => sum + item.byteSize, 0);
    const showDates = hasSourceDates(options.items);
    const descriptionHtml =
      initialPending === 0
        ? `Nenhum documento válido para importar em <strong>${escapeHtml(options.chainTitle)}</strong>.`
        : `Adicionar ${documentLabel(initialPending)} como ${
            initialPending === 1 ? 'nova nota' : 'novas notas'
          } em <strong>${escapeHtml(options.chainTitle)}</strong>.`;

    const backdrop = el('div', 'dialog-backdrop');
    backdrop.setAttribute('role', 'presentation');

    const dialog = el(
      'div',
      'dialog dialog--wide import-dialog import-files-dialog import-queue-dialog'
    );
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', titleId);
    dialog.setAttribute('aria-describedby', `${descriptionId} ${errorId}`);

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
        <button class="btn-icon" id="import-queue-close-${uid}" type="button" aria-label="Fechar" title="Fechar">
          <span class="material-symbols-rounded" aria-hidden="true">close</span>
        </button>
      </div>

      <div class="import-queue-progress">
        <div class="import-queue-progress__header">
          <span id="${progressLabelId}" class="import-queue-progress__label" aria-live="polite"></span>
          <span class="import-queue-progress__bytes">${escapeHtml(formatFileSize(totalBytes))}</span>
        </div>
        <div
          class="import-queue-progress__track"
          id="${progressId}"
          role="progressbar"
          aria-valuemin="0"
          aria-valuemax="${total}"
          aria-valuenow="0"
          aria-labelledby="${progressLabelId}"
        >
          <div class="import-queue-progress__fill"></div>
        </div>
        <p class="import-dialog__support" id="${storageNoteId}"></p>
      </div>

      <div class="import-batch-summary" aria-label="Resumo da importação">
        <span class="import-batch-summary__item">
          <span class="material-symbols-rounded" aria-hidden="true">description</span>
          <span id="import-queue-total-${uid}">${documentLabel(total)}</span>
        </span>
        <span class="import-batch-summary__item import-batch-summary__item--ok">
          <span class="material-symbols-rounded" aria-hidden="true">check_circle</span>
          <span id="import-queue-ok-${uid}">0 importados</span>
        </span>
        <span class="import-batch-summary__item import-batch-summary__item--error">
          <span class="material-symbols-rounded" aria-hidden="true">error</span>
          <span id="import-queue-failed-${uid}">0 com falha</span>
        </span>
        <span class="import-batch-summary__item" id="import-queue-pending-${uid}">
          <span class="material-symbols-rounded" aria-hidden="true">schedule</span>
          <span>${initialPending} pendentes</span>
        </span>
        <span class="import-batch-summary__item" id="import-queue-duplicates-${uid}" hidden>
          <span class="material-symbols-rounded" aria-hidden="true">content_copy</span>
          <span>0 ignorados</span>
        </span>
      </div>

      ${
        showDates
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
        <button class="btn btn-text" id="import-queue-cancel-${uid}" type="button" data-autofocus>Cancelar</button>
        <button class="btn btn-filled" id="import-queue-confirm-${uid}" type="button" ${
          initialPending === 0 ? 'disabled' : ''
        }>
          <span class="material-symbols-rounded" aria-hidden="true">upload_file</span>
          <span id="import-queue-confirm-label-${uid}">Importar ${documentLabel(initialPending)}</span>
        </button>
      </div>
    `;

    const list = dialog.querySelector<HTMLElement>(`#${listId}`)!;
    const cancel = dialog.querySelector<HTMLButtonElement>(`#import-queue-cancel-${uid}`)!;
    const close = dialog.querySelector<HTMLButtonElement>(`#import-queue-close-${uid}`)!;
    const confirm = dialog.querySelector<HTMLButtonElement>(`#import-queue-confirm-${uid}`)!;
    const confirmLabel = dialog.querySelector<HTMLElement>(
      `#import-queue-confirm-label-${uid}`
    )!;
    const error = dialog.querySelector<HTMLElement>(`#${errorId}`)!;
    const dateSwitch = dialog.querySelector<HTMLInputElement>(`#${dateSwitchId}`);
    const progress = dialog.querySelector<HTMLElement>(`#${progressId}`)!;
    const progressFill = dialog.querySelector<HTMLElement>(
      '.import-queue-progress__fill'
    )!;
    const progressLabel = dialog.querySelector<HTMLElement>(`#${progressLabelId}`)!;
    const storageNote = dialog.querySelector<HTMLElement>(`#${storageNoteId}`)!;
    const okCount = dialog.querySelector<HTMLElement>(`#import-queue-ok-${uid}`)!;
    const failedCount = dialog.querySelector<HTMLElement>(`#import-queue-failed-${uid}`)!;
    const pendingCount = dialog.querySelector<HTMLElement>(`#import-queue-pending-${uid}`)!;
    const duplicatesCount = dialog.querySelector<HTMLElement>(
      `#import-queue-duplicates-${uid}`
    )!;

    const rowByName = new Map<number, HTMLButtonElement | HTMLElement>();
    const statusByName = new Map<number, HTMLElement>();
    const failureByName = new Map<number, HTMLElement>();

    let importing = false;
    let completed = false;
    let settled = false;
    let destroy = (): void => {};

    for (const item of options.items) {
      const row = el('article', 'import-batch-item');
      row.setAttribute('role', 'listitem');
      rowByName.set(item.index, row);

      const header = el('div', 'import-batch-item__header');
      const status = el('span', 'import-batch-item__status');
      statusByName.set(item.index, status);

      const info = el('div', 'import-batch-item__info');
      const name = el('span', 'import-batch-item__name');
      name.textContent = item.fileName;
      const meta = el('span', 'import-batch-item__meta');
      meta.textContent = formatFileSize(item.byteSize);
      info.append(name, meta);
      header.append(status, info);
      row.appendChild(header);

      const failure = el('p', 'import-batch-item__failure');
      failure.hidden = true;
      failureByName.set(item.index, failure);
      row.appendChild(failure);

      list.appendChild(row);
    }

    const applyItem = (item: TextImportItem): void => {
      const row = rowByName.get(item.index);
      const status = statusByName.get(item.index);
      const failure = failureByName.get(item.index);
      if (!row || !status || !failure) return;

      const presentation = STATUS[item.status];
      row.classList.toggle('import-batch-item--error', item.status === 'failed');
      row.classList.toggle('import-batch-item--duplicate', item.status === 'duplicate');
      status.className = `import-batch-item__status ${presentation.className}`;
      status.innerHTML = `<span class="material-symbols-rounded" aria-hidden="true">${presentation.icon}</span> ${presentation.label}`;

      if (item.error) {
        failure.textContent = item.error;
        failure.hidden = false;
      } else {
        failure.textContent = '';
        failure.hidden = true;
      }
    };

    const applySnapshot = (snapshot: TextImportQueueSnapshot): void => {
      snapshot.items.forEach(applyItem);

      progress.setAttribute('aria-valuenow', String(snapshot.processed));
      const ratio = snapshot.total === 0 ? 0 : snapshot.processed / snapshot.total;
      progressFill.style.width = `${Math.round(ratio * 100)}%`;
      progressLabel.textContent = `${snapshot.processed} de ${snapshot.total} processados`;

      okCount.textContent = `${snapshot.succeeded} ${
        snapshot.succeeded === 1 ? 'importado' : 'importados'
      }`;
      failedCount.textContent = `${snapshot.failed} com falha`;
      pendingCount.hidden = snapshot.pending === 0;
      pendingCount.innerHTML = `<span class="material-symbols-rounded" aria-hidden="true">schedule</span><span>${snapshot.pending} pendentes</span>`;
      duplicatesCount.hidden = snapshot.duplicates === 0;
      duplicatesCount.innerHTML = `<span class="material-symbols-rounded" aria-hidden="true">content_copy</span><span>${snapshot.duplicates} ignorados</span>`;

      if (snapshot.storage) {
        storageNote.textContent = `Espaço livre estimado: ${formatFileSize(
          snapshot.storage.availableBytes
        )} · ${snapshot.storage.persisted ? 'armazenamento persistente' : 'armazenamento não persistente'}.`;
      } else {
        storageNote.textContent = '';
      }
    };

    const initialSucceeded = options.items.filter(
      (item) => item.status === 'imported'
    ).length;
    const initialFailed = options.items.filter((item) => item.status === 'failed').length;
    const initialDuplicates = options.items.filter(
      (item) => item.status === 'duplicate'
    ).length;
    options.items.forEach(applyItem);
    applySnapshot({
      items: options.items,
      total,
      processed: initialSucceeded + initialFailed + initialDuplicates,
      pending: initialPending,
      succeeded: initialSucceeded,
      failed: initialFailed,
      duplicates: initialDuplicates,
      storage: null,
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
      confirm.disabled = busy;
      if (dateSwitch) dateSwitch.disabled = busy;
      confirmLabel.textContent = busy
        ? 'Importando...'
        : completed
          ? 'Fechar'
          : `Importar ${documentLabel(
              options.items.filter((item) => item.status === 'pending').length
            )}`;
    };

    const complete = (result: TextImportQueueResult): void => {
      completed = true;
      importing = false;
      setBusy(false);
      cancel.textContent = 'Fechar';
      confirmLabel.textContent = 'Fechar';
      confirm.disabled = false;
      if (result.succeeded === 0 && result.failed > 0) {
        error.textContent = 'Nenhum documento foi importado.';
      } else if (result.failed > 0) {
        error.textContent = `${result.failed} ${
          result.failed === 1 ? 'documento não foi importado' : 'documentos não foram importados'
        }.`;
      }
      confirm.focus();
    };

    const submit = async (): Promise<void> => {
      if (completed) {
        finish(true);
        return;
      }
      if (importing) return;

      const pending = options.items.filter((item) => item.status === 'pending').length;
      if (pending === 0) return;

      setBusy(true);
      error.textContent = '';

      try {
        const result = await options.run(
          Boolean(dateSwitch?.checked),
          (snapshot) => applySnapshot(snapshot)
        );
        applySnapshot({
          items: result.items,
          total: result.total,
          processed: result.succeeded + result.failed + result.duplicates,
          pending: 0,
          succeeded: result.succeeded,
          failed: result.failed,
          duplicates: result.duplicates,
          storage: result.storage,
        });
        complete(result);
      } catch (submitError: unknown) {
        error.textContent =
          submitError instanceof Error
            ? submitError.message
            : 'Não foi possível importar os documentos.';
        importing = false;
        setBusy(false);
      }
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
