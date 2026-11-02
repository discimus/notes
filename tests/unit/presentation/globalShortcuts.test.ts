import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  initGlobalShortcuts,
  type GlobalShortcutActions,
} from '@presentation/app/shortcuts.js';

function makeActions(overrides: Partial<GlobalShortcutActions> = {}): GlobalShortcutActions {
  return {
    openSearch: vi.fn(),
    openBlankDocument: vi.fn(),
    openNewCollection: vi.fn(),
    leaveSearch: vi.fn(),
    isDialogOpen: vi.fn(() => false),
    isSearchView: vi.fn(() => false),
    ...overrides,
  };
}

function press(
  key: string,
  options: KeyboardEventInit = {},
  target: EventTarget = document
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  target.dispatchEvent(event);
  return event;
}

describe('global keyboard shortcuts', () => {
  let cleanup: (() => void) | null = null;

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    cleanup?.();
    cleanup = null;
    document.body.innerHTML = '';
  });

  it('cria um documento em branco com N', () => {
    const actions = makeActions();
    cleanup = initGlobalShortcuts(actions);

    const event = press('n');

    expect(actions.openBlankDocument).toHaveBeenCalledOnce();
    expect(actions.openNewCollection).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it('abre o cadastro de coleção com Shift+N', () => {
    const actions = makeActions();
    cleanup = initGlobalShortcuts(actions);

    const event = press('N', { shiftKey: true });

    expect(actions.openNewCollection).toHaveBeenCalledOnce();
    expect(actions.openBlankDocument).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it('não dispara atalhos de N enquanto o usuário edita texto', () => {
    document.body.innerHTML = '<textarea id="field"></textarea>';
    const field = document.querySelector<HTMLTextAreaElement>('#field')!;
    const actions = makeActions();
    cleanup = initGlobalShortcuts(actions);

    const plain = press('n', {}, field);
    const collection = press('N', { shiftKey: true }, field);

    expect(actions.openBlankDocument).not.toHaveBeenCalled();
    expect(actions.openNewCollection).not.toHaveBeenCalled();
    expect(plain.defaultPrevented).toBe(false);
    expect(collection.defaultPrevented).toBe(false);
  });

  it('não abre outro fluxo quando já existe um diálogo', () => {
    document.body.innerHTML = '<div class="dialog-backdrop"></div>';
    const actions = makeActions({ isDialogOpen: vi.fn(() => true) });
    cleanup = initGlobalShortcuts(actions);

    press('n');
    press('N', { shiftKey: true });

    expect(actions.openBlankDocument).not.toHaveBeenCalled();
    expect(actions.openNewCollection).not.toHaveBeenCalled();
  });

  it('mantém Ctrl+K para pesquisar', () => {
    const actions = makeActions();
    cleanup = initGlobalShortcuts(actions);

    const event = press('k', { ctrlKey: true });

    expect(actions.openSearch).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
  });

  it('volta da pesquisa com Escape quando não há diálogo', () => {
    const actions = makeActions({ isSearchView: vi.fn(() => true) });
    cleanup = initGlobalShortcuts(actions);

    const event = press('Escape');

    expect(actions.leaveSearch).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
  });
});
