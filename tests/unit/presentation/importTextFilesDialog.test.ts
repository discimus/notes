import { afterEach, describe, expect, it, vi } from 'vitest';
import { showImportTextFilesDialog } from '@presentation/components/ImportTextFilesDialog.js';
import type { PreparedTextImport } from '@presentation/app/textFileImport.js';

function validFile(overrides: Partial<PreparedTextImport> = {}): PreparedTextImport {
  return {
    fileName: 'notas.txt',
    byteSize: 1024,
    sourceModifiedAt: '2024-03-12T14:30:00.000Z',
    content: 'Linha 1\nLinha 2\nLinha 3\nLinha 4\nLinha 5\nLinha 6',
    preview: 'Linha 1\nLinha 2\nLinha 3\nLinha 4\nLinha 5\nLinha 6',
    head: 'Linha 1\nLinha 2\nLinha 3\nLinha 4\nLinha 5',
    hasMoreLines: true,
    characterCount: 41,
    truncated: false,
    ...overrides,
  };
}

function options(
  overrides: Partial<Parameters<typeof showImportTextFilesDialog>[0]> = {}
) {
  return {
    chainTitle: 'Projeto',
    valid: [validFile(), validFile({ fileName: 'outro.txt' })],
    rejected: [],
    totalBytes: 2048,
    onConfirm: vi.fn().mockResolvedValue({ ok: true } as const),
    ...overrides,
  };
}

describe('ImportTextFilesDialog', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('lista arquivos, HEAD e conteúdo completo expansível', async () => {
    const resultPromise = showImportTextFilesDialog(options());
    const dialog = document.querySelector<HTMLElement>('.import-files-dialog')!;

    expect(dialog.textContent).toContain('Importar 2 documentos');
    expect(dialog.querySelectorAll('.import-batch-item')).toHaveLength(2);
    expect(dialog.querySelectorAll('.import-batch-item__head')).toHaveLength(2);
    expect(dialog.querySelector('.import-batch-item__head')?.textContent).toBe(
      'Linha 1\nLinha 2\nLinha 3\nLinha 4\nLinha 5'
    );

    const expand = dialog.querySelector<HTMLButtonElement>('.import-batch-item__expand')!;
    expand.click();

    expect(expand.getAttribute('aria-expanded')).toBe('true');
    expect(
      dialog.querySelector<HTMLElement>('.import-batch-item__full-text')?.textContent
    ).toContain('Linha 6');

    expand.click();
    expect(expand.getAttribute('aria-expanded')).toBe('false');

    dialog.querySelector<HTMLButtonElement>('[id^="import-files-cancel-"]')?.click();
    await expect(resultPromise).resolves.toBe(false);
  });

  it('confirma os válidos com o switch global de datas', async () => {
    const onConfirm = vi.fn().mockResolvedValue({ ok: true } as const);
    const resultPromise = showImportTextFilesDialog(options({ onConfirm }));
    const dialog = document.querySelector<HTMLElement>('.import-files-dialog')!;

    expect(dialog.querySelector<HTMLInputElement>('[role="switch"]')?.checked).toBe(true);
    dialog.querySelector<HTMLButtonElement>('[id^="import-files-confirm-"]')?.click();

    await expect(resultPromise).resolves.toBe(true);
    expect(onConfirm).toHaveBeenCalledWith(true);
  });

  it('indica falha por arquivo e falha global sem fechar', async () => {
    const onConfirm = vi.fn().mockResolvedValue({
      ok: false,
      error: 'Falha ao persistir.',
    } as const);
    const resultPromise = showImportTextFilesDialog(
      options({
        valid: [validFile()],
        rejected: [
          { fileName: 'binario.txt', byteSize: 3, error: 'Arquivo binário.' },
        ],
        onConfirm,
      })
    );
    const dialog = document.querySelector<HTMLElement>('.import-files-dialog')!;

    expect(dialog.querySelector('.import-batch-item--error')?.textContent).toContain(
      'Arquivo binário.'
    );
    dialog.querySelector<HTMLButtonElement>('[id^="import-files-confirm-"]')?.click();

    await vi.waitFor(() => {
      expect(dialog.querySelector('.import-dialog__error')?.textContent).toBe(
        'Falha ao persistir.'
      );
    });
    expect(dialog.querySelector('.import-batch-item__status--error')).not.toBeNull();

    dialog.querySelector<HTMLButtonElement>('[id^="import-files-cancel-"]')?.click();
    await expect(resultPromise).resolves.toBe(false);
  });

  it('mantém confirmação desabilitada quando nenhum arquivo é válido', async () => {
    const resultPromise = showImportTextFilesDialog(
      options({
        valid: [],
        rejected: [
          { fileName: 'a.txt', byteSize: 1, error: 'Arquivo vazio.' },
          { fileName: 'b.txt', byteSize: 1, error: 'Arquivo binário.' },
        ],
        totalBytes: 2,
      })
    );
    const dialog = document.querySelector<HTMLElement>('.import-files-dialog')!;

    expect(dialog.textContent).toContain('Importar 2 documentos');
    expect(
      dialog.querySelector<HTMLButtonElement>('[id^="import-files-confirm-"]')?.disabled
    ).toBe(true);
    expect(dialog.querySelectorAll('.import-batch-item--error')).toHaveLength(2);

    dialog.querySelector<HTMLButtonElement>('[id^="import-files-cancel-"]')?.click();
    await expect(resultPromise).resolves.toBe(false);
  });
});
