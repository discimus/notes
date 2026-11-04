import { showConfirmDialog } from './Dialog.js';

export function showExampleScenarioDialog(): Promise<boolean> {
  return showConfirmDialog({
    title: 'Bem-vindo ao Notes!',
    body: 'O Notes organiza suas ideias em coleções de notas, com busca, tags e timeline. Tudo fica salvo localmente no navegador, sem conta. Quer começar com um cenário de exemplo — incluindo um guia de importação de arquivos e pastas — ou começar em branco?',
    icon: 'auto_awesome',
    confirmLabel: 'Carregar exemplos',
    cancelLabel: 'Começar em branco',
  });
}
