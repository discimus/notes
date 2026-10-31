import type { DraftTab } from '../state/EditorStore.js';
import { isEditorTabDirty } from '../state/EditorStore.js';
import { el } from '../dom.js';
import { mountActiveLineHighlight } from './ActiveLineHighlight.js';

export interface DraftDocumentHandlers {
  onInput: (value: string) => void;
}

export interface DraftDocumentView {
  element: HTMLElement;
  update: (tab: DraftTab) => void;
  setSaving: (saving: boolean) => void;
  focus: () => void;
  destroy: () => void;
}

function countWords(content: string): number {
  const trimmed = content.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function mountDraftDocument(
  tab: DraftTab,
  handlers: DraftDocumentHandlers
): DraftDocumentView {
  const root = el('section', 'editor-surface draft-document');
  root.id = 'editor-panel';
  root.setAttribute('role', 'tabpanel');

  root.innerHTML = `
    <div class="editor-body">
      <textarea class="editor-textarea" id="draft-textarea"
        placeholder="Comece a escrever..."
        aria-label="Conteúdo do documento"
        spellcheck="true"></textarea>
    </div>

    <div class="editor-statusbar">
      <span id="draft-stats"></span>
      <div class="editor-statusbar__meta">
        <span class="editor-target" id="draft-target" hidden>
          <span class="editor-target__icon material-symbols-rounded" aria-hidden="true">description</span>
          <span id="draft-target-text"></span>
        </span>
        <span class="editor-save-state" id="draft-save-state" role="status" aria-live="polite"></span>
        <span class="editor-statusbar__shortcut">Ctrl+S para salvar</span>
      </div>
    </div>
  `;

  const panel = root;
  const target = root.querySelector<HTMLElement>('#draft-target')!;
  const targetText = root.querySelector<HTMLElement>('#draft-target-text')!;
  const targetIcon = root.querySelector<HTMLElement>('.editor-target__icon')!;
  const saveState = root.querySelector<HTMLElement>('#draft-save-state')!;
  const textarea = root.querySelector<HTMLTextAreaElement>('#draft-textarea')!;
  const stats = root.querySelector<HTMLElement>('#draft-stats')!;
  const body = root.querySelector<HTMLElement>('.editor-body')!;
  const activeLine = mountActiveLineHighlight(textarea, body);

  let currentTab = tab;

  const syncSurface = (): void => {
    panel.setAttribute('aria-labelledby', `editor-tab-${currentTab.id}`);

    target.hidden = !currentTab.target;
    targetText.textContent = currentTab.target
      ? `Em “${currentTab.target.chainTitle ?? 'Cadeia'}”`
      : '';
    targetIcon.textContent = currentTab.target ? 'link' : 'description';
    target.classList.toggle('editor-target--linked', Boolean(currentTab.target));

    const dirty = isEditorTabDirty(currentTab);
    saveState.textContent = dirty
      ? 'Alterações não salvas'
      : currentTab.target
        ? 'Salvo'
        : 'Pronto para escrever';
    saveState.classList.toggle('editor-save-state--dirty', dirty);

    const characters = currentTab.content.length;
    const words = countWords(currentTab.content);
    stats.textContent = `${characters} ${
      characters === 1 ? 'caractere' : 'caracteres'
    } · ${words} ${words === 1 ? 'palavra' : 'palavras'}`;
  };

  textarea.value = tab.content;
  textarea.addEventListener('input', () => {
    currentTab = { ...currentTab, content: textarea.value };
    handlers.onInput(textarea.value);
    syncSurface();
  });
  const update = (tabValue: DraftTab): void => {
    currentTab = tabValue;
    if (textarea !== document.activeElement && textarea.value !== tabValue.content) {
      textarea.value = tabValue.content;
    }
    syncSurface();
    activeLine.refresh();
  };

  const setSaving = (saving: boolean): void => {
    if (saving) {
      saveState.textContent = 'Salvando...';
      saveState.classList.remove('editor-save-state--dirty');
      return;
    }
    syncSurface();
  };

  return {
    element: root,
    update,
    setSaving,
    focus: () => textarea.focus(),
    destroy: () => activeLine.destroy(),
  };
}
