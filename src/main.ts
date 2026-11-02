import '@presentation/styles/base.css';
import '@presentation/styles/components.css';
import '@presentation/styles/layout.css';

import { renderApp } from '@presentation/pages/render.js';
import { AppController } from '@presentation/pages/AppController.js';

async function bootstrap(): Promise<void> {
  const root = document.getElementById('app')!;

  // Detecta preferência de tema
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');

  // Inicializa e renderiza
  try {
    renderApp(root);
    await AppController.init();
  } catch (error) {
    console.error('[Notes] Erro ao inicializar:', error);
    root.innerHTML = `
      <div class="fatal-error">
        <span class="fatal-error__icon material-symbols-rounded" aria-hidden="true">warning</span>
        <p class="fatal-error__title">Erro ao inicializar o Notes</p>
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
