import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppController } from '@presentation/pages/AppController.js';
import {
  getAttachmentUrl,
  releaseAllAttachmentUrls,
  releaseAttachmentUrl,
} from '@presentation/components/attachmentUrls.js';

const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

describe('URLs de anexos', () => {
  beforeEach(() => {
    releaseAllAttachmentUrls();
    vi.spyOn(AppController, 'getAttachmentBlob').mockResolvedValue(
      new Blob(['media'], { type: 'image/png' })
    );
    Object.defineProperty(URL, 'createObjectURL', {
      value: vi.fn(() => 'blob:attachment'),
      configurable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: vi.fn(),
      configurable: true,
    });
  });

  afterEach(() => {
    releaseAllAttachmentUrls();
    Object.defineProperty(URL, 'createObjectURL', {
      value: originalCreateObjectURL,
      configurable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: originalRevokeObjectURL,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  it('reutiliza a URL e revoga ao liberar', async () => {
    const first = await getAttachmentUrl('attachment-1');
    const second = await getAttachmentUrl('attachment-1');

    expect(first).toBe('blob:attachment');
    expect(second).toBe(first);
    expect(AppController.getAttachmentBlob).toHaveBeenCalledTimes(1);

    releaseAttachmentUrl('attachment-1');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:attachment');
  });
});
