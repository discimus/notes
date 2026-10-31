# presentation/AGENTS.md — UI, Estado e CSS

## Estrutura

```
app/shell.ts        → renderApp, subscrição do estado, updateContent e FAB
app/theme.ts        → preferência de tema e aplicação de data-theme
app/navigation.ts   → histórico (pushState/popstate)
views/              → nav, topbar, chains, search, timeline, tags, menus
components/         → Dialog, Snackbar, states (empty/loading)
dom.ts              → el(), qs(), qsa()
filters.ts          → filtros puros de apresentação
pages/AppController.ts
pages/render.ts     → shim de compatibilidade para app/shell.ts
state/              → AppState, DraftStore
styles/             → tokens, base, layout, components
```

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

`chainFilterQuery` é o filtro local do painel de cadeias. A busca global usa `searchQuery`/`searchResults` e o use case `SearchNotes`.

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
- Navegação: rail fixo de 80px em `≥769px`; drawer modal de 280px em `≤768px`. O hambúrguer (`#nav-toggle`) só aparece no compacto. O toggle de tema fica no rodapé do rail/drawer.

## Renderização DOM — sem framework

O projeto usa DOM vanilla. Os helpers ficam em `src/presentation/dom.ts`:

```typescript
import { el, qs, qsa } from '../dom.js';

const card = el('div', 'chain-card');
card.innerHTML = `<span>${escapeHtml(userContent)}</span>`;
```

Use `escapeHtml()` sempre que inserir conteúdo de usuário via `innerHTML`. Para texto puro, prefira `textContent`. Novas views devem ficar em `views/` e novos componentes reutilizáveis em `components/`.

## Bootstrap — `src/main.ts`

Sequência de inicialização: importa CSS → `renderApp(root)` (inicializa tema, histórico, shell e FAB) → `AppController.init()` → registra atalhos globais (`Ctrl+K` busca, `N` nova cadeia, `Escape` volta).

Não modifique `main.ts` para adicionar features — adicione no `AppController` e nas `views/`/`app/shell.ts`.

## Testes

Testes de apresentação ficam em `tests/unit/presentation/` e usam jsdom. Não edite testes existentes; adicione novos arquivos de teste.
