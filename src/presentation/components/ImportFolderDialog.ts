import { escapeHtml } from '@shared/utilities/index.js';
import { el } from '../dom.js';
import { mountDialog } from './Dialog.js';
import { formatFileSize } from '../app/textFileImport.js';
import type {
  FolderImportProgress,
  FolderImportResult,
} from '../app/folderImportFlow.js';

export interface ImportFolderDialogGroup {
  title: string;
  fileCount: number;
  totalBytes: number;
  rejectedCount: number;
}

export type FolderImportMode = 'collections' | 'append';

export interface ImportFolderDialogOptions {
  groups: ImportFolderDialogGroup[];
  totalFiles: number;
  totalBytes: number;
  showDateOption: boolean;
  discoveryErrors?: string[];
  appendTarget?: { id: string; title: string } | undefined;
  onConfirm: (
    mode: FolderImportMode,
    useSourceDates: boolean,
    onProgress: (progress: FolderImportProgress) => void,
    isCancelled: () => boolean
  ) => Promise<FolderImportResult>;
}

let dialogSequence = 0;

function documentLabel(count: number): string {
  return `${count} ${count === 1 ? 'documento' : 'documentos'}`;
}

function collectionLabel(count: number): string {
  return `${count} ${count === 1 ? 'coleção' : 'coleções'}`;
}

export function showImportFolderDialog(
  options: ImportFolderDialogOptions
): Promise<boolean> {
  return new Promise((resolve) => {
    const uid = ++dialogSequence;
    const titleId = `import-folder-title-${uid}`;
    const descriptionId = `import-folder-description-${uid}`;
    const listId = `import-folder-list-${uid}`;
    const errorId = `import-folder-error-${uid}`;
    const dateSwitchId = `import-folder-date-${uid}`;
    const progressId = `import-folder-progress-${uid}`;
    const progressLabelId = `import-folder-progress-label-${uid}`;

    const importableGroups = options.groups.filter(
      (group) => group.fileCount > 0
    );
    const importableFiles = importableGroups.reduce(
      (total, group) => total + group.fileCount,
      0
    );
    const initialPending = importableGroups.length;

    const backdrop = el('div', 'dialog-backdrop');
    backdrop.setAttribute('role', 'presentation');

    const dialog = el(
      'div',
      'dialog dialog--wide import-dialog import-files-dialog import-queue-dialog import-folder-dialog'
    );
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', titleId);
    dialog.setAttribute('aria-describedby', `${descriptionId} ${errorId}`);

    dialog.innerHTML = `
      <div class="dialog__header">
        <div>
          <h2 id="${titleId}" class="dialog__title dialog__title--left">
            Importar pastas
          </h2>
          <p id="${descriptionId}" class="dialog__body dialog__body--left">
            Criar ${collectionLabel(initialPending)} a partir de ${documentLabel(
              importableFiles
            )}. Pastas sem arquivos válidos serão ignoradas.
          </p>
        </div>
        <button class="btn-icon" id="import-folder-close-${uid}" type="button" aria-label="Fechar" title="Fechar">
          <span class="material-symbols-rounded" aria-hidden="true">close</span>
        </button>
      </div>

      ${
        options.appendTarget
          ? `
        <fieldset class="import-dialog__destination">
          <legend class="import-dialog__destination-title">Destino da importação</legend>
          <label class="import-dialog__destination-option">
            <input type="radio" name="import-folder-mode-${uid}" value="collections" checked />
            <span>Criar uma coleção por pasta</span>
          </label>
          <label class="import-dialog__destination-option">
            <input type="radio" name="import-folder-mode-${uid}" value="append" />
            <span>Adicionar à coleção <strong>${escapeHtml(
              options.appendTarget.title
            )}</strong></span>
          </label>
        </fieldset>
      `
          : ''
      }

      <div class="import-queue-progress">
        <div class="import-queue-progress__header">
          <span id="${progressLabelId}" class="import-queue-progress__label" aria-live="polite"></span>
          <span class="import-queue-progress__bytes">${escapeHtml(
            formatFileSize(options.totalBytes)
          )}</span>
        </div>
        <div
          class="import-queue-progress__track"
          id="${progressId}"
          role="progressbar"
          aria-valuemin="0"
          aria-valuemax="${Math.max(1, options.totalFiles)}"
          aria-valuenow="0"
          aria-labelledby="${progressLabelId}"
        >
          <div class="import-queue-progress__fill"></div>
        </div>
      </div>

      <div class="import-batch-summary" aria-label="Resumo da importação">
        <span class="import-batch-summary__item">
          <span class="material-symbols-rounded" aria-hidden="true">folder</span>
          <span id="import-folder-total-${uid}">${collectionLabel(
            initialPending
          )}</span>
        </span>
        <span class="import-batch-summary__item import-batch-summary__item--ok">
          <span class="material-symbols-rounded" aria-hidden="true">check_circle</span>
          <span id="import-folder-ok-${uid}">0 notas importadas</span>
        </span>
        <span class="import-batch-summary__item import-batch-summary__item--error">
          <span class="material-symbols-rounded" aria-hidden="true">error</span>
          <span id="import-folder-failed-${uid}">0 falhas</span>
        </span>
        <span class="import-batch-summary__item" id="import-folder-skipped-${uid}">
          <span class="material-symbols-rounded" aria-hidden="true">schedule</span>
          <span>${initialPending} pendentes</span>
        </span>
        <span class="import-batch-summary__item" id="import-folder-duplicates-${uid}" hidden>
          <span class="material-symbols-rounded" aria-hidden="true">content_copy</span>
          <span>0 duplicados</span>
        </span>
      </div>

      ${
        options.showDateOption
          ? `
        <div class="import-dialog__date-option">
          <label class="md-switch" for="${dateSwitchId}">
            <input class="md-switch__input" id="${dateSwitchId}" type="checkbox" role="switch" checked />
            <span class="md-switch__track" aria-hidden="true"><span class="md-switch__thumb"></span></span>
            <span class="md-switch__label">Usar datas dos arquivos</span>
          </label>
          <p class="import-dialog__support">
            Cada nota aparecerá no histórico e na timeline na data do respectivo arquivo.
          </p>
        </div>
      `
          : ''
      }

      <div class="import-batch-list" id="${listId}" role="list" aria-label="Pastas selecionadas"></div>
      <p class="import-dialog__error" id="${errorId}" role="alert"></p>

      <div class="dialog__actions">
        <button class="btn btn-text" id="import-folder-cancel-${uid}" type="button" data-autofocus>Cancelar</button>
        <button class="btn btn-filled" id="import-folder-confirm-${uid}" type="button" ${
          initialPending === 0 ? 'disabled' : ''
        }>
          <span class="material-symbols-rounded" aria-hidden="true">create_new_folder</span>
          <span id="import-folder-confirm-label-${uid}">Importar ${collectionLabel(
            initialPending
          )}</span>
        </button>
      </div>
    `;

    const list = dialog.querySelector<HTMLElement>(`#${listId}`)!;
    const cancel = dialog.querySelector<HTMLButtonElement>(
      `#import-folder-cancel-${uid}`
    )!;
    const close = dialog.querySelector<HTMLButtonElement>(
      `#import-folder-close-${uid}`
    )!;
    const confirm = dialog.querySelector<HTMLButtonElement>(
      `#import-folder-confirm-${uid}`
    )!;
    const confirmLabel = dialog.querySelector<HTMLElement>(
      `#import-folder-confirm-label-${uid}`
    )!;
    const error = dialog.querySelector<HTMLElement>(`#${errorId}`)!;
    const dateSwitch = dialog.querySelector<HTMLInputElement>(
      `#${dateSwitchId}`
    );
    const progress = dialog.querySelector<HTMLElement>(`#${progressId}`)!;
    const progressFill = dialog.querySelector<HTMLElement>(
      '.import-queue-progress__fill'
    )!;
    const progressLabel = dialog.querySelector<HTMLElement>(
      `#${progressLabelId}`
    )!;
    const okCount = dialog.querySelector<HTMLElement>(
      `#import-folder-ok-${uid}`
    )!;
    const totalCount = dialog.querySelector<HTMLElement>(
      `#import-folder-total-${uid}`
    )!;
    const failedCount = dialog.querySelector<HTMLElement>(
      `#import-folder-failed-${uid}`
    )!;
    const skippedCount = dialog.querySelector<HTMLElement>(
      `#import-folder-skipped-${uid}`
    )!;
    const duplicatesCount = dialog.querySelector<HTMLElement>(
      `#import-folder-duplicates-${uid}`
    )!;

    options.groups.forEach((group) => {
      const row = el('article', 'import-batch-item');
      row.setAttribute('role', 'listitem');

      const header = el('div', 'import-batch-item__header');
      const status = el(
        'span',
        `import-batch-item__status ${
          group.fileCount === 0
            ? 'import-batch-item__status--pending'
            : 'import-batch-item__status--ok'
        }`
      );
      status.innerHTML = `<span class="material-symbols-rounded" aria-hidden="true">${
        group.fileCount === 0 ? 'schedule' : 'folder'
      }</span> ${group.fileCount === 0 ? 'Ignorada' : 'Pronta'}`;

      const info = el('div', 'import-batch-item__info');
      const name = el('span', 'import-batch-item__name');
      name.textContent = group.title;
      const meta = el('span', 'import-batch-item__meta');
      meta.textContent = `${documentLabel(group.fileCount)} · ${formatFileSize(
        group.totalBytes
      )}${
        group.rejectedCount > 0
          ? ` · ${group.rejectedCount} ${
              group.rejectedCount === 1 ? 'rejeitado' : 'rejeitados'
            }`
          : ''
      }`;
      info.append(name, meta);
      header.append(status, info);
      row.appendChild(header);
      list.appendChild(row);
    });

    if (options.discoveryErrors && options.discoveryErrors.length > 0) {
      for (const message of options.discoveryErrors) {
        const row = el('article', 'import-batch-item import-batch-item--error');
        row.setAttribute('role', 'listitem');
        const failure = el('p', 'import-batch-item__failure');
        failure.textContent = message;
        row.appendChild(failure);
        list.appendChild(row);
      }
    }

    let importing = false;
    let completed = false;
    let cancelRequested = false;
    let settled = false;
    let destroy = (): void => {};

    const description = dialog.querySelector<HTMLElement>(`#${descriptionId}`)!;
    const modeInputs = [
      ...dialog.querySelectorAll<HTMLInputElement>(
        `input[name="import-folder-mode-${uid}"]`
      ),
    ];
    const appendTarget = options.appendTarget ?? null;
    const selectedMode = (): FolderImportMode =>
      appendTarget &&
      modeInputs.find((input) => input.checked)?.value === 'append'
        ? 'append'
        : 'collections';
    const modeImportLabel = (): string =>
      selectedMode() === 'append'
        ? `Importar ${documentLabel(importableFiles)}`
        : `Importar ${collectionLabel(initialPending)}`;
    const updateModePresentation = (): void => {
      if (selectedMode() === 'append' && appendTarget) {
        description.textContent = `Adicionar ${documentLabel(
          importableFiles
        )} à coleção "${appendTarget.title}".`;
      } else {
        description.textContent = `Criar ${collectionLabel(
          initialPending
        )} a partir de ${documentLabel(
          importableFiles
        )}. Pastas sem arquivos válidos serão ignoradas.`;
      }
      if (!importing && !completed) {
        confirmLabel.textContent = modeImportLabel();
      }
      totalCount.textContent =
        selectedMode() === 'append'
          ? documentLabel(importableFiles)
          : collectionLabel(initialPending);
    };
    modeInputs.forEach((input) =>
      input.addEventListener('change', updateModePresentation)
    );
    updateModePresentation();

    const finish = (result: boolean): void => {
      if (settled) return;
      settled = true;
      destroy();
      resolve(result);
    };

    const setBusy = (busy: boolean): void => {
      importing = busy;
      dialog.setAttribute('aria-busy', busy ? 'true' : 'false');
      close.disabled = busy;
      confirm.disabled = busy;
      if (dateSwitch) dateSwitch.disabled = busy;
      modeInputs.forEach((input) => {
        input.disabled = busy;
      });
      cancel.disabled = busy && completed;
      if (busy && !completed) {
        cancel.textContent = 'Cancelar importação';
      }
      confirmLabel.textContent = busy
        ? 'Importando...'
        : completed
          ? 'Fechar'
          : modeImportLabel();
    };

    const applyProgress = (snapshot: FolderImportProgress): void => {
      progress.setAttribute(
        'aria-valuenow',
        String(snapshot.filesProcessed)
      );
      const ratio =
        snapshot.filesTotal === 0
          ? 0
          : snapshot.filesProcessed / snapshot.filesTotal;
      progressFill.style.width = `${Math.round(ratio * 100)}%`;
      progressLabel.textContent = snapshot.currentFolder
        ? `Importando "${snapshot.currentFolder}" · ${snapshot.filesProcessed} de ${snapshot.filesTotal} arquivos`
        : `${snapshot.filesProcessed} de ${snapshot.filesTotal} arquivos processados`;

      okCount.textContent = `${snapshot.notesImported} ${
        snapshot.notesImported === 1 ? 'nota importada' : 'notas importadas'
      }`;
      failedCount.textContent = `${snapshot.failedFiles + snapshot.failedFolders} ${
        snapshot.failedFiles + snapshot.failedFolders === 1 ? 'falha' : 'falhas'
      }`;
      skippedCount.hidden = snapshot.skippedFolders === 0;
      skippedCount.innerHTML = `<span class="material-symbols-rounded" aria-hidden="true">schedule</span><span>${snapshot.skippedFolders} ignoradas</span>`;
      duplicatesCount.hidden = snapshot.duplicates === 0;
      duplicatesCount.innerHTML = `<span class="material-symbols-rounded" aria-hidden="true">content_copy</span><span>${snapshot.duplicates} duplicados</span>`;
    };

    const complete = (result: FolderImportResult): void => {
      completed = true;
      setBusy(false);
      cancel.textContent = 'Fechar';
      cancel.disabled = false;
      confirmLabel.textContent = 'Fechar';
      confirm.disabled = false;
      const message = result.failures[0]
        ? result.failures[0].message
        : result.cancelled
          ? 'Importação cancelada. As coleções já criadas foram mantidas.'
          : '';
      error.textContent = message;
      confirm.focus();
    };

    const submit = async (): Promise<void> => {
      if (completed) {
        finish(true);
        return;
      }
      if (importing || initialPending === 0) return;

      cancelRequested = false;
      setBusy(true);
      error.textContent = '';

      try {
        const result = await options.onConfirm(
          selectedMode(),
          Boolean(dateSwitch?.checked),
          applyProgress,
          () => cancelRequested
        );
        applyProgress(result);
        complete(result);
      } catch (submitError: unknown) {
        error.textContent =
          submitError instanceof Error
            ? submitError.message
            : 'Não foi possível importar as pastas.';
        setBusy(false);
      }
    };

    backdrop.appendChild(dialog);
    destroy = mountDialog(backdrop, dialog, () => finish(false), {
      canClose: () => !importing,
    });

    cancel.addEventListener('click', () => {
      if (importing && !completed) {
        cancelRequested = true;
        cancel.disabled = true;
        cancel.textContent = 'Cancelando...';
        return;
      }
      finish(false);
    });
    close.addEventListener('click', () => finish(false));
    confirm.addEventListener('click', () => {
      void submit();
    });
  });
}
