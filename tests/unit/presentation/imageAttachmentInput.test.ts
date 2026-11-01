import { describe, expect, it, vi } from 'vitest';
import {
  pickImagesWithClipboardFallback,
  type PickImagesDependencies,
} from '@presentation/components/imageAttachmentInput.js';

function clipboardImage(mimeType = 'image/png'): {
  types: string[];
  getType: (type: string) => Promise<Blob>;
} {
  return {
    types: ['text/plain', mimeType],
    getType: async () => new Blob(['image'], { type: mimeType }),
  };
}

describe('seleção de imagem com clipboard', () => {
  it('usa a primeira imagem do clipboard sem abrir o seletor', async () => {
    const onFiles = vi.fn();
    const openFilePicker = vi.fn();
    const dependencies: PickImagesDependencies = {
      readClipboard: async () => [
        { types: ['text/plain'], getType: async () => new Blob([]) },
        clipboardImage(),
      ],
      openFilePicker,
    };

    await pickImagesWithClipboardFallback(onFiles, dependencies);

    expect(onFiles).toHaveBeenCalledTimes(1);
    const files = onFiles.mock.calls[0]?.[0] as File[];
    expect(files).toHaveLength(1);
    expect(files[0]?.type).toBe('image/png');
    expect(openFilePicker).not.toHaveBeenCalled();
  });

  it('abre o seletor quando o clipboard não tem imagem', async () => {
    const onFiles = vi.fn();
    const openFilePicker = vi.fn();
    const dependencies: PickImagesDependencies = {
      readClipboard: async () => [
        { types: ['text/plain'], getType: async () => new Blob([]) },
      ],
      openFilePicker,
    };

    await pickImagesWithClipboardFallback(onFiles, dependencies);

    expect(onFiles).not.toHaveBeenCalled();
    expect(openFilePicker).toHaveBeenCalledWith(onFiles);
  });

  it('abre o seletor quando a leitura do clipboard falha', async () => {
    const onFiles = vi.fn();
    const openFilePicker = vi.fn();

    await pickImagesWithClipboardFallback(onFiles, {
      readClipboard: async () => {
        throw new Error('permission denied');
      },
      openFilePicker,
    });

    expect(onFiles).not.toHaveBeenCalled();
    expect(openFilePicker).toHaveBeenCalledWith(onFiles);
  });

  it('abre o seletor quando getType falha', async () => {
    const onFiles = vi.fn();
    const openFilePicker = vi.fn();

    await pickImagesWithClipboardFallback(onFiles, {
      readClipboard: async () => [
        {
          types: ['image/png'],
          getType: async () => {
            throw new Error('leitura falhou');
          },
        },
      ],
      openFilePicker,
    });

    expect(onFiles).not.toHaveBeenCalled();
    expect(openFilePicker).toHaveBeenCalledWith(onFiles);
  });
});
