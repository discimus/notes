import './presentation/styles/base.css';
import './presentation/styles/components.css';
import './presentation/styles/layout.css';

import { renderApp } from './presentation/pages/render.js';
import { AppController } from './presentation/pages/AppController.js';
import { appState } from './presentation/state/AppState.js';

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
      appState.set({ view: 'search', searchQuery: '', searchResults: [] });
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
        appState.set({ view: 'chains' });
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
      <div style="display:flex;align-items:center;justify-content:center;height:100dvh;flex-direction:column;gap:16px;padding:24px;text-align:center;">
        <span style="font-size:48px;color:#B3261E">⚠</span>
        <p style="font-size:18px;font-weight:500">Erro ao inicializar o ThreadNotes</p>
        <p style="font-size:14px;color:#49454E;max-width:400px">
          Verifique o console para mais detalhes. Pode ser necessário limpar os dados do site.
        </p>
        <button onclick="location.reload()" style="padding:10px 24px;background:#6750A4;color:#fff;border:none;border-radius:20px;cursor:pointer;font-size:14px;">
          Recarregar
        </button>
      </div>
    `;
  }
}

bootstrap();
