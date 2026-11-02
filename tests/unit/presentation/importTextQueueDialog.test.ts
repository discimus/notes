import { afterEach, describe, expect, it, vi } from 'vitest';
import { showImportTextQueueDialog } from '@presentation/components/ImportTextQueueDialog.js';
import type {
  TextImportItem,
  TextImportItemStatus,
} from '@presentation/app/textFileImport.js';
import type {
  TextImportQueueResult,
  TextImportQueueSnapshot,
} from '@presentation/app/textImportQueue.js';

function item(
  index: number,
  status: TextImportItemStatus = 'pending',
  error?: string
): TextImportItem {
  const fileName = `arquivo-${index}.txt`;
  return {
    index,
    file: new File(['texto'], fileName, { lastModified: 1000 }),
    fileName,
    byteSize: 5,
    status,
    ...(error ? { error } : {}),
  };
}

function result(items: TextImportItem[]): TextImportQueueResult {
  return {
    items,
    total: items.length,
    succeeded: items.filter((entry) => entry.status === 'imported').length,
    failed: items.filter((entry) => entry.status === 'failed').length,
    duplicates: items.filter((entry) => entry.status === 'duplicate').length,
    storage: null,
  };
}

describe('ImportTextQueueDialog', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('mostra progresso, status individual e mantém o resultado aberto', async () => {
    const items = [item(0), item(1), item(2)];
    const run = vi.fn(
      async (
        _useDates: boolean,
        onProgress: (snapshot: TextImportQueueSnapshot) => void
      ) => {
      items[0]!.status = 'imported';
      items[1]!.status = 'imported';
      items[2]!.status = 'failed';
      items[2]!.error = 'Arquivo binário.';
      onProgress({
        items,
        total: 3,
        processed: 2,
        pending: 1,
        succeeded: 2,
        failed: 0,
        duplicates: 0,
        storage: null,
      });
      return result(items);
    });

    const pending = showImportTextQueueDialog({
      chainTitle: 'Projeto',
      items,
      run,
    });
    const dialog = document.querySelector<HTMLElement>('.import-queue-dialog')!;

    expect(dialog.textContent).toContain('Importar 3 documentos');
    expect(dialog.querySelectorAll('.import-batch-item')).toHaveLength(3);
    expect(dialog.querySelector('[role="progressbar"]')?.getAttribute('aria-valuemax')).toBe(
      '3'
    );

    dialog.querySelector<HTMLButtonElement>('[id^="import-queue-confirm-"]')?.click();

    await vi.waitFor(() => {
      expect(dialog.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe(
        '3'
      );
    });

    expect(run).toHaveBeenCalledWith(true, expect.any(Function));
    expect(dialog.querySelectorAll('.import-batch-item__status--ok')).toHaveLength(2);
    expect(dialog.querySelector('.import-batch-item--error')?.textContent).toContain(
      'Arquivo binário.'
    );
    expect(dialog.querySelector('.import-batch-item--error')?.textContent).toContain('Falha');
    expect(dialog.textContent).toContain('1 documento não foi importado');
    expect(dialog.querySelector<HTMLElement>('[id^="import-queue-confirm-label-"]')?.textContent).toBe(
      'Fechar'
    );

    dialog.querySelector<HTMLButtonElement>('[id^="import-queue-confirm-"]')?.click();
    await expect(pending).resolves.toBe(true);
  });

  it('mostra rejeitados e duplicados já no plano inicial', async () => {
    const items = [
      item(0),
      item(1, 'failed', 'O arquivo está vazio.'),
      item(2, 'duplicate', 'Arquivo duplicado de "arquivo-0.txt".'),
    ];

    const pending = showImportTextQueueDialog({
      chainTitle: 'Projeto',
      items,
      run: vi.fn().mockResolvedValue(result(items)),
    });
    const dialog = document.querySelector<HTMLElement>('.import-queue-dialog')!;

    expect(dialog.querySelectorAll('.import-batch-item--error')).toHaveLength(1);
    expect(dialog.querySelectorAll('.import-batch-item--duplicate')).toHaveLength(1);
    expect(dialog.textContent).toContain('1 ignorados');

    dialog.querySelector<HTMLButtonElement>('[id^="import-queue-cancel-"]')?.click();
    await expect(pending).resolves.toBe(false);
  });

  it('desabilita a confirmação quando não há arquivos pendentes', async () => {
    const items = [item(0, 'failed', 'Inválido.')];

    const pending = showImportTextQueueDialog({
      chainTitle: 'Projeto',
      items,
      run: vi.fn(),
    });
    const dialog = document.querySelector<HTMLElement>('.import-queue-dialog')!;

    expect(
      dialog.querySelector<HTMLButtonElement>('[id^="import-queue-confirm-"]')?.disabled
    ).toBe(true);

    dialog.querySelector<HTMLButtonElement>('[id^="import-queue-cancel-"]')?.click();
    await expect(pending).resolves.toBe(false);
  });
});
