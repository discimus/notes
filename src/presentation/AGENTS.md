# presentation/AGENTS.md — UI, Estado e CSS

## AppController — ponto de entrada único

`src/presentation/pages/AppController.ts` é o **único lugar** que instancia repositórios e use cases.

```typescript
// ✅ correto — toda ação da UI passa pelo controller
await AppController.createChain(content, title, tagNames);

// ❌ errado — nunca instanciar use cases diretamente em componentes ou render.ts
const uc = new CreateChainWithHeader(repo, tagRepo);
await uc.execute(cmd);
```

Ao adicionar novo use case: instanciar no topo do `AppController.ts` (junto aos demais) e expor como método público do objeto `AppController`.

## AppState — store reativo

`src/presentation/state/AppState.ts` — singleton `appState`.

```typescript
appState.get()                    // retorna shallow copy do estado atual
appState.set({ isLoading: true }) // merge parcial + notifica listeners
appState.subscribe(fn)            // retorna unsubscribe — limpar em teardown
```

**Views disponíveis** (`AppView`): `'chains' | 'chain-detail' | 'search' | 'timeline' | 'tags' | 'favorites' | 'archived' | 'trash'`

Nunca mutate o objeto retornado por `get()`. Sempre use `set()` com partial.

## DraftStore — rascunhos do compositor

`src/presentation/state/DraftStore.ts` — persiste em `sessionStorage`, sobrevive a reload.

```typescript
DraftStore.save({ content, title?, mode: 'header'|'tail', chainId?, savedAt })
DraftStore.load()  // Draft | null
DraftStore.clear() // sempre chamar após criar/anexar nota com sucesso
```

## Dialog e Snackbar

```typescript
// Confirmação com ação destrutiva
const ok = await showConfirmDialog({ title, body?, icon?, confirmLabel?, destructive? });

// Input simples
const value = await showInputDialog({ title, label, initialValue?, placeholder? });

// Feedback
snackbar.success('Mensagem.');
snackbar.error('Erro.');
snackbar.success('Ação feita.', { label: 'Desfazer', onClick: () => desfazer() });
```

Ações destrutivas **sempre** pedem confirmação via `showConfirmDialog` antes de chamar o controller.

## CSS — `src/presentation/styles/`

| Arquivo | Conteúdo |
|---|---|
| `tokens.css` | Variáveis de design: `--md-sys-color-*`, `--md-sys-typescale-*` |
| `base.css` | Reset, body, tipografia base |
| `layout.css` | Grid, drawer, panels, responsivo |
| `components.css` | Botões, cards, chips, dialogs, snackbar, text-field |

- Dark mode: `@media (prefers-color-scheme: dark)` + atributo `[data-theme="dark"]` no `<html>`.
- Nomenclatura BEM: `.chain-card__title`, `.tag-chip--selected`, `.btn--destructive`.
- Tokens MD3: use `var(--md-sys-color-primary)` etc. — nunca valores de cor literais.
- **Nunca** ler `components.css` inteiro — use grep para a classe específica.

## Renderização DOM — sem framework

O projeto usa DOM vanilla. Não há `el()` helper (diferente do kanban). Padrão do projeto:

```typescript
// Criar elementos diretamente
const card = document.createElement('div');
card.className = 'chain-card';

// Usar innerHTML com escapeHtml para conteúdo dinâmico
import { escapeHtml } from '@shared/utilities/index.js';
element.innerHTML = `<span>${escapeHtml(userContent)}</span>`;
```

Use `escapeHtml()` sempre que inserir conteúdo de usuário via `innerHTML`. Para texto puro, prefira `textContent`.

## Bootstrap — `src/main.ts`

Sequência de inicialização: importa CSS → detecta tema → monta DOM via `renderApp(root)` → `AppController.init()` → registra atalhos globais (`Ctrl+K` busca, `N` nova cadeia, `Escape` volta).

Não modifique `main.ts` para adicionar features — adicione no `AppController` e no `render.ts`.
