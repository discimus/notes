import { IMAGE_ATTACHMENT_MIME_TYPES } from '@shared/types/index.js';

function extensionForImageMime(mimeType: string): string {
  if (mimeType.includes('jpeg')) return 'jpg';
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('gif')) return 'gif';
  if (mimeType.includes('avif')) return 'avif';
  return 'png';
}

interface ClipboardItemLike {
  types: readonly string[];
  getType(type: string): Promise<Blob>;
}

export interface PickImagesDependencies {
  readClipboard?: (() => Promise<readonly ClipboardItemLike[]>) | undefined;
  openFilePicker?: ((onFiles: (files: File[]) => void) => void) | undefined;
}

export function openImageFilePicker(onFiles: (files: File[]) => void): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = IMAGE_ATTACHMENT_MIME_TYPES.join(',');
  input.multiple = true;
  input.hidden = true;
  input.addEventListener('change', () => {
    const files = input.files ? [...input.files] : [];
    input.remove();
    if (files.length > 0) onFiles(files);
  });
  input.addEventListener('cancel', () => input.remove());
  document.body.appendChild(input);
  input.click();
}

export async function pickImagesWithClipboardFallback(
  onFiles: (files: File[]) => void,
  dependencies: PickImagesDependencies = {}
): Promise<void> {
  const openFilePicker = dependencies.openFilePicker ?? openImageFilePicker;
  const readClipboard =
    dependencies.readClipboard ??
    (navigator.clipboard?.read
      ? () => navigator.clipboard.read()
      : undefined);

  if (!readClipboard) {
    openFilePicker(onFiles);
    return;
  }

  let file: File | null = null;
  try {
    const items = await readClipboard();
    for (const item of items) {
      const mimeType = item.types.find((type) =>
        (IMAGE_ATTACHMENT_MIME_TYPES as readonly string[]).includes(type)
      );
      if (!mimeType) continue;

      const blob = await item.getType(mimeType);
      file = new File(
        [blob],
        `clipboard-${Date.now()}.${extensionForImageMime(mimeType)}`,
        { type: mimeType }
      );
      break;
    }
  } catch {
    openFilePicker(onFiles);
    return;
  }

  if (file) {
    onFiles([file]);
    return;
  }

  openFilePicker(onFiles);
}

export async function readImageDimensions(
  blob: Blob
): Promise<{ width?: number; height?: number }> {
  if (typeof Image === 'undefined' || typeof URL.createObjectURL !== 'function') return {};
  const url = URL.createObjectURL(blob);
  return new Promise((resolve) => {
    const image = new Image();
    image.addEventListener('load', () => {
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      URL.revokeObjectURL(url);
      resolve(width > 0 && height > 0 ? { width, height } : {});
    });
    image.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      resolve({});
    });
    image.src = url;
  });
}
