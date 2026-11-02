import { beforeEach, describe, expect, it } from 'vitest';
import {
  getAutoImportFiles,
  setAutoImportFiles,
} from '@presentation/app/autoImportFiles.js';

describe('autoImportFiles', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('vem desativado por padrão', () => {
    expect(getAutoImportFiles()).toBe(false);
  });

  it('persiste a preferência', () => {
    setAutoImportFiles(true);
    expect(getAutoImportFiles()).toBe(true);
    expect(localStorage.getItem('threadnotes.auto-import-files')).toBe('true');

    setAutoImportFiles(false);
    expect(getAutoImportFiles()).toBe(false);
    expect(localStorage.getItem('threadnotes.auto-import-files')).toBe('false');
  });
});
