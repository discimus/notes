import { beforeEach, describe, expect, it, vi } from 'vitest';
import { appState } from '@presentation/state/AppState.js';
import { mountEditorSidebar } from '@presentation/components/EditorSidebar.js';

function folderDropEvent(): DragEvent {
  const event = new Event('drop', {
    bubbles: true,
    cancelable: true,
  }) as DragEvent;
  Object.defineProperty(event, 'dataTransfer', {
    value: {
      types: ['Files'],
      files: [],
      dropEffect: 'none',
      items: [
        {
          kind: 'file',
          webkitGetAsEntry: () => ({ isDirectory: true, isFile: false }),
        },
      ],
    },
  });
  return event;
}

describe('EditorSidebar folder import', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('abre o seletor de diretório e encaminha os arquivos', () => {
    const onImportFolderFiles = vi.fn();
    const view = mountEditorSidebar({
      onOpenChain: vi.fn(),
      onNewChain: vi.fn(),
      onFilter: vi.fn(),
      onTogglePin: vi.fn(),
      onImportFolderFiles,
    });
    document.body.appendChild(view.element);
    view.update({ ...appState.get(), chainSummaries: [] }, null);

    const button = view.element.querySelector<HTMLButtonElement>(
      '#editor-import-folder'
    );
    const input = view.element.querySelector<HTMLInputElement>(
      '#editor-import-folder-input'
    );
    expect(button).not.toBeNull();
    expect(input?.hasAttribute('webkitdirectory')).toBe(true);

    const file = new File(['texto'], 'a.txt', { type: 'text/plain' });
    Object.defineProperty(input!, 'files', {
      configurable: true,
      value: [file],
    });
    input?.dispatchEvent(new Event('change'));

    expect(onImportFolderFiles).toHaveBeenCalledWith([file]);
  });

  it('encaminha drop de diretório para a importação por pastas', () => {
    const onImportFiles = vi.fn();
    const onImportFolderDrop = vi.fn();
    const view = mountEditorSidebar({
      onOpenChain: vi.fn(),
      onNewChain: vi.fn(),
      onFilter: vi.fn(),
      onTogglePin: vi.fn(),
      onImportFiles,
      onImportFolderDrop,
    });
    document.body.appendChild(view.element);
    view.update({ ...appState.get(), chainSummaries: [] }, null);

    const list = view.element.querySelector<HTMLElement>(
      '#editor-sidebar-list'
    )!;
    const event = folderDropEvent();
    list.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(onImportFolderDrop).toHaveBeenCalledTimes(1);
    expect(onImportFiles).not.toHaveBeenCalled();
  });
});
