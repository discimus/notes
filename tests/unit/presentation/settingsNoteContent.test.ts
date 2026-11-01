import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { showSettingsDialog } from '@presentation/components/SettingsDialog.js';
import { getFullNoteContent } from '@presentation/app/noteContentDisplay.js';
import { appState } from '@presentation/state/AppState.js';

describe('configuração de conteúdo completo das notas', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    appState.set({ fullNoteContent: false });
  });

  afterEach(() => {
    document.querySelector<HTMLButtonElement>('#settings-done')?.click();
    document.body.innerHTML = '';
  });

  it('exibe a opção desmarcada com label e texto de apoio', () => {
    showSettingsDialog();

    const dialog = document.querySelector('#settings-dialog');
    const checkbox = dialog?.querySelector<HTMLInputElement>(
      '#settings-full-note-content'
    );
    const sectionLabel = dialog?.querySelector('#settings-notes-title')?.textContent;
    const label = checkbox?.closest('.settings-row')?.querySelector(
      '.settings-row__label'
    )?.textContent;
    const support = checkbox?.closest('.settings-row')?.querySelector(
      '.settings-row__support'
    )?.textContent;

    expect(sectionLabel).toBe('Notas');
    expect(checkbox).not.toBeNull();
    expect(checkbox?.checked).toBe(false);
    expect(checkbox?.getAttribute('aria-describedby')).toBe(
      'settings-full-note-content-support'
    );
    expect(label).toBe('Mostrar conteúdo completo das notas');
    expect(support).toContain('3 linhas');
    expect(support).toContain('4 linhas');
  });

  it('aplica e persiste a preferência imediatamente', () => {
    showSettingsDialog();

    const checkbox = document.querySelector<HTMLInputElement>(
      '#settings-full-note-content'
    );
    if (!checkbox) throw new Error('Checkbox não encontrado');

    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));

    expect(getFullNoteContent()).toBe(true);
    expect(appState.get().fullNoteContent).toBe(true);
    expect(localStorage.getItem('threadnotes.notes.full-content')).toBe('true');
    expect(document.querySelector('#settings-status')?.textContent).toBe(
      'Conteúdo completo ativado.'
    );

    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));

    expect(getFullNoteContent()).toBe(false);
    expect(appState.get().fullNoteContent).toBe(false);
    expect(document.querySelector('#settings-status')?.textContent).toBe(
      'Conteúdo completo desativado.'
    );
  });
});
