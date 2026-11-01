import { afterEach, describe, expect, it, vi } from 'vitest';
import { showImportTextDialog } from '@presentation/components/ImportTextDialog.js';

function options(overrides: Partial<Parameters<typeof showImportTextDialog>[0]> = {}) {
  return {
    chainTitle: 'Projeto',
    fileName: 'notas.txt',
    byteSize: 1024,
    sourceModifiedAt: '2024-03-12T14:30:00.000Z',
    preview: 'Conteúdo do documento',
    characterCount: 21,
    truncated: false,
    onConfirm: vi.fn().mockResolvedValue({ ok: true } as const),
    ...overrides,
  };
}

describe('ImportTextDialog', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('mostra metadados, preview e confirma com a data do arquivo', async () => {
    const onConfirm = vi.fn().mockResolvedValue({ ok: true } as const);
    const resultPromise = showImportTextDialog(options({ onConfirm }));
    const dialog = document.querySelector<HTMLElement>('.import-dialog');
    const switchInput = dialog?.querySelector<HTMLInputElement>('[role="switch"]');
    const preview = dialog?.querySelector('.import-dialog__preview-text');

    expect(dialog?.textContent).toContain('notas.txt');
    expect(dialog?.textContent).toContain('1 KB');
    expect(preview?.textContent).toBe('Conteúdo do documento');
    expect(switchInput?.checked).toBe(true);

    dialog?.querySelector<HTMLButtonElement>('[id^="import-confirm-"]')?.click();

    await expect(resultPromise).resolves.toBe(true);
    expect(onConfirm).toHaveBeenCalledWith(true);
    expect(document.querySelector('.import-dialog')).toBeNull();
  });

  it('permite desativar a data do arquivo', async () => {
    const onConfirm = vi.fn().mockResolvedValue({ ok: true } as const);
    const resultPromise = showImportTextDialog(options({ onConfirm }));
    const dialog = document.querySelector<HTMLElement>('.import-dialog')!;
    const switchInput = dialog.querySelector<HTMLInputElement>('[role="switch"]')!;

    switchInput.checked = false;
    dialog.querySelector<HTMLButtonElement>('[id^="import-confirm-"]')?.click();

    await expect(resultPromise).resolves.toBe(true);
    expect(onConfirm).toHaveBeenCalledWith(false);
  });

  it('mantém o preview aberto e exibe erro inline', async () => {
    const onConfirm = vi.fn().mockResolvedValue({
      ok: false,
      error: 'Falha ao importar.',
    } as const);
    const resultPromise = showImportTextDialog(options({ onConfirm }));
    const dialog = document.querySelector<HTMLElement>('.import-dialog')!;

    dialog.querySelector<HTMLButtonElement>('[id^="import-confirm-"]')?.click();

    await vi.waitFor(() => {
      expect(dialog.querySelector('.import-dialog__error')?.textContent).toBe(
        'Falha ao importar.'
      );
    });
    expect(document.querySelector('.import-dialog')).not.toBeNull();

    dialog.querySelector<HTMLButtonElement>('[id^="import-cancel-"]')?.click();
    await expect(resultPromise).resolves.toBe(false);
  });

  it('não fecha com Escape enquanto está importando', async () => {
    let resolveImport!: (value: { ok: true }) => void;
    const pending = new Promise<{ ok: true }>((resolve) => {
      resolveImport = resolve;
    });
    const resultPromise = showImportTextDialog(
      options({ onConfirm: vi.fn().mockReturnValue(pending) })
    );
    const dialog = document.querySelector<HTMLElement>('.import-dialog')!;

    dialog.querySelector<HTMLButtonElement>('[id^="import-confirm-"]')?.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(document.querySelector('.import-dialog')).not.toBeNull();

    resolveImport({ ok: true });
    await expect(resultPromise).resolves.toBe(true);
  });
});
