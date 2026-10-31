import '@presentation/styles/base.css';
import '@presentation/styles/components.css';
import '@presentation/styles/layout.css';

import { renderApp } from '@presentation/pages/render.js';
import { AppController } from '@presentation/pages/AppController.js';
import { appState } from '@presentation/state/AppState.js';

async function bootstrap(): Promise<void> {
  const root = document.getElementById('app')!;

  // Detecta preferência de tema
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');

  // Keyboard shortcuts globais
  document.addEventListener('keydown', (e) => {
    const target = e.target as HTMLElement;
    const isEditing = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

    // Ctrl+K — pesquisa
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      appState.set({ searchQuery: '', searchResults: [] });
      void AppController.navigateTo('search');
      return;
    }

    // N — nova cadeia (quando não está editando)
    if (e.key === 'n' && !isEditing && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      appState.set({ view: 'chains' });
      // Pequeno delay para garantir que o DOM foi atualizado
      setTimeout(() => {
        const newBtn = document.querySelector<HTMLElement>('[aria-label*="Nova cadeia"]');
        newBtn?.click();
      }, 50);
      return;
    }

    // Escape — fecha modais/volta para lista
    if (e.key === 'Escape' && !isEditing) {
      const backdrop = document.querySelector('.dialog-backdrop');
      if (backdrop) return; // modal aberto — o modal mesmo lida
      if (appState.get().view === 'search') {
        void AppController.navigateTo('chains');
      }
    }
  });

  // Inicializa e renderiza
  try {
    renderApp(root);
    await AppController.init();
  } catch (error) {
    console.error('[ThreadNotes] Erro ao inicializar:', error);
    root.innerHTML = `
      <div class="fatal-error">
        <span class="fatal-error__icon material-symbols-rounded" aria-hidden="true">warning</span>
        <p class="fatal-error__title">Erro ao inicializar o ThreadNotes</p>
        <p class="fatal-error__body">
          Verifique o console para mais detalhes. Pode ser necessário limpar os dados do site.
        </p>
        <button class="btn btn-filled" id="fatal-error-reload" type="button">
          Recarregar
        </button>
      </div>
    `;
    root.querySelector('#fatal-error-reload')?.addEventListener('click', () => location.reload());
  }
}

bootstrap();
