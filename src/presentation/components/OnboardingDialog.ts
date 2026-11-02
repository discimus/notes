import { showConfirmDialog } from './Dialog.js';

export function showExampleScenarioDialog(): Promise<boolean> {
  return showConfirmDialog({
    title: 'Bem-vindo ao Notes!',
    body: 'Deseja carregar um cenário de exemplo com coleções, notas e tags para explorar o aplicativo? Você também pode começar em branco.',
    icon: 'auto_awesome',
    confirmLabel: 'Carregar exemplos',
    cancelLabel: 'Começar em branco',
  });
}
