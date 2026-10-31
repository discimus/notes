# presentation/AGENTS.md — UI, Estado e CSS

## Estrutura

```
app/shell.ts        → renderApp, subscrição do estado, updateContent e FAB
app/theme.ts        → preferência de tema e aplicação de data-theme
app/settings.ts     → preferências persistidas (confirmação da lixeira)
app/compactMode.ts  → densidade compacta persistida
app/navigation.ts   → histórico (pushState/popstate)
app/editorGrouping.ts → agrupamento puro de notas por data
views/              → nav, topbar, editor, chains, search, timeline, tags, menus
components/         → Dialog, EditorTabs, EditorSidebar, DraftDocument, ChainDocument, ActiveLineHighlight, ChainListItem, AppendToChainDialog, CloseTabDialog, SettingsDialog, Snackbar, states
dom.ts              → el(), qs(), qsa()
filters.ts          → filtros puros de apresentação
pages/AppController.ts
pages/render.ts     → shim de compatibilidade para app/shell.ts
state/              → AppState, DraftStore, EditorStore
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

**Views disponíveis** (`AppView`): `'editor' | 'chains' | 'chain-detail' | 'search' | 'timeline' | 'tags' | 'favorites' | 'archived' | 'trash'`

A view inicial é `'editor'`. O conteúdo das abas **não** fica no `AppState`; use `EditorStore` para evitar re-render global a cada tecla.

`chainFilterQuery` é o filtro local do painel de cadeias. A busca global usa `searchQuery`/`searchResults` e o use case `SearchNotes`.

Nunca mutate o objeto retornado por `get()`. Sempre use `set()` com partial.

## DraftStore — rascunhos do compositor

`src/presentation/state/DraftStore.ts` — persiste em `sessionStorage`, sobrevive a reload.

```typescript
DraftStore.save({ content, title?, mode: 'header'|'tail', chainId?, savedAt })
DraftStore.load()  // Draft | null
DraftStore.clear() // sempre chamar após criar/anexar nota com sucesso
```

## EditorStore — workspace com abas

`src/presentation/state/EditorStore.ts` — singleton `editorStore`, separado do `AppState`.

```typescript
editorStore.ensureTab()
editorStore.createDraftTab()
editorStore.openChainTab(chainId, title)
editorStore.selectTab(id)
editorStore.updateDraftContent(id, content)
editorStore.createChainNoteTab(chainTabId)
editorStore.selectChainNoteTab(chainTabId, noteTabId)
editorStore.updateChainNoteTab(chainTabId, noteTabId, content)
editorStore.removeChainNoteTab(chainTabId, noteTabId)
editorStore.ensureChainNoteTab(chainTabId)
editorStore.setChainTabNotes(id, detail)
editorStore.appendNoteToChainTab(id, note)
editorStore.markDraftSaved(id, target, savedContent)
editorStore.closeTab(id)
editorStore.closeChainTabs(chainId)
editorStore.hasDirtyTabs()
editorStore.flush()
```

- Existem dois níveis de aba: `DraftTab`/`ChainTab` no topo e `ChainNoteTab` no rodapé da cadeia.
- `DraftTab`: texto independente; primeiro salvamento abre `AppendToChainDialog`; próximos `Ctrl+S` atualizam a nota anexada.
- `ChainTab`: histórico da cadeia agrupado por data + abas de notas pendentes.
- `ChainNoteTab`: nota ainda não persistida. Ao salvar, vira uma nova tail da cadeia pai e a aba é fechada; uma nova aba vazia é criada. Notas já salvas são editadas pelo histórico.
- O dirty state da `ChainTab` é agregado de todas as `ChainNoteTab`.
- Persiste abas, aba ativa e notas pendentes em `sessionStorage` (`threadnotes.editor.tabs`) com debounce. Notas já persistidas são recarregadas do IndexedDB.
- `openChainInEditor`, `loadEditorChainTab`, `appendToEditorChainTab`, `saveEditorToChain` e `updateEditorNote` vivem no `AppController`.
- `Ctrl+S`, `beforeunload`, sidebar mobile e foco das notas ficam na view Editor/sessão, não em `main.ts`.

## Configurações

- A engrenagem `#settings-toggle` fica no rodapé do rail/drawer, acima do tema.
- `threadnotes.settings.confirmBeforeTrash` persiste em `localStorage`; default `true`.
- A preferência controla apenas mover cadeias para a lixeira. Exclusão permanente, remoção de tags e arquivamento continuam sempre confirmando.
- `showSettingsDialog()` usa `mountDialog`; a alteração é aplicada imediatamente.

## Realce da linha ativa

- `ActiveLineHighlight` é usado nos textareas de documento e de nota da cadeia.
- O foco do textarea **não** usa `outline`; o indicador visual é a linha ativa + caret.
- A posição é calculada com espelho oculto do textarea, considerando quebra automática, scroll, fonte e padding.
- O componente deve ser destruído no teardown da view para remover listeners, `ResizeObserver` e elementos auxiliares.
- A camada é `aria-hidden`, `pointer-events: none` e não interfere em seleção, IME ou undo nativo.

## Modo compacto

- Preferência separada em `threadnotes.compact-mode`, via `app/compactMode.ts`.
- `AppState.compactMode` aplica `app-shell--compact`.
- O modo altera apenas densidade: larguras, alturas, paddings e gaps.
- **Não** ocultar navegação, topbar, sidebar, abas ou qualquer elemento estrutural.
- Controle no rodapé da navegação (`#compact-toggle`), com `aria-pressed` e labels dinâmicos.
- O estado é independente do recolhimento do rodapé de notas da cadeia.

## Dialog e Snackbar

```typescript
// Confirmação com ação destrutiva
const ok = await showConfirmDialog({ title, body?, icon?, confirmLabel?, destructive? });

// Input simples
const value = await showInputDialog({ title, label, initialValue?, placeholder? });

// Configurações
showSettingsDialog();

// Feedback
snackbar.success('Mensagem.');
snackbar.error('Erro.');
snackbar.success('Ação feita.', { label: 'Desfazer', onClick: () => desfazer() });
```

Ações destrutivas **sempre** pedem confirmação via `showConfirmDialog` antes de chamar o controller, exceto mover para a lixeira quando `confirmBeforeTrash` está desativado; nesse caso o snackbar de “Desfazer” permanece obrigatório.

## CSS — `src/presentation/styles/`

| Arquivo | Conteúdo |
|---|---|
| `tokens.css` | Variáveis de design: `--md-sys-color-*`, `--md-sys-typescale-*` |
| `base.css` | Reset, body, tipografia base |
| `layout.css` | Grid, drawer, panels, responsivo |
| `components.css` | Botões, cards, chips, dialogs, snackbar, text-field |

- Dark mode: `@media (prefers-color-scheme: dark)` + atributo `[data-theme="dark"]` no `<html>`.
- Nomenclatura BEM: `.chain-item__title`, `.tag-chip--selected`, `.btn--destructive`.
- Lista de cadeias: item compacto de 2 linhas em 64px, com título + data/notas + favorito. Excerpt e tags ficam no detalhe, não na lista.
- Tokens MD3: use `var(--md-sys-color-primary)` etc. — nunca valores de cor literais.
- **Nunca** ler `components.css` inteiro — use grep para a classe específica.
- Navegação: rail fixo de 80px em `≥769px`; drawer modal de 280px em `≤768px`. O hambúrguer (`#nav-toggle`) só aparece no compacto. Configurações, tema e modo compacto ficam no rodapé do rail/drawer.
- A navegação não deve ter scroll próprio: conteúdo com `overflow: hidden`, itens de 52px, footer com botões de 48px e dimensões ajustadas para caber sem rolagem.
- Workspace Editor: lateral de 300px no desktop e off-canvas no compacto. O botão `#editor-explorer-toggle` abre/fecha a lateral no mobile; overlay usa o scrim MD3.
- Documento e histórico da cadeia são full-bleed: sem `max-width` centralizado, margem automática, borda ou raio de card. A sidebar de cadeias permanece fixa como Explorer.
- Abas usam `role="tablist"`; o documento ativo é `role="tabpanel"`. O compositor da cadeia é o único ponto que cria novas tails na view principal.
- `renderTabList`: duplo clique no espaço vazio cria nova aba (`onCreate`); clique com botão do scroll fecha a aba (`auxclick`, botão 1). Esses atalhos complementam, não substituem, os botões e o teclado.
- O rodapé de notas da cadeia é colapsável. `ChainTab.composerCollapsed` é persistido por aba; `aria-expanded`, `aria-controls` e `hidden` controlam a acessibilidade. Quando recolhido, o histórico ocupa o espaço liberado.

## Renderização DOM — sem framework

O projeto usa DOM vanilla. Os helpers ficam em `src/presentation/dom.ts`:

```typescript
import { el, qs, qsa } from '../dom.js';

const item = el('div', 'chain-item');
item.innerHTML = `<span>${escapeHtml(userContent)}</span>`;
```

Use `escapeHtml()` sempre que inserir conteúdo de usuário via `innerHTML`. Para texto puro, prefira `textContent`. Novas views devem ficar em `views/` e novos componentes reutilizáveis em `components/`.

## Bootstrap — `src/main.ts`

Sequência de inicialização: importa CSS → `renderApp(root)` (inicializa tema, histórico, shell e FAB) → `AppController.init()` → registra atalhos globais (`Ctrl+K` busca, `N` nova cadeia, `Escape` volta).

Não modifique `main.ts` para adicionar features — adicione no `AppController` e nas `views/`/`app/shell.ts`.

## Testes

Testes de apresentação ficam em `tests/unit/presentation/` e usam jsdom. Não edite testes existentes; adicione novos arquivos de teste.

- `npm run test` é a validação principal para mudanças de UI, com timeout de **120000 ms**.
- Cobrir, quando aplicável: tabs e navegação por teclado, dirty state, fechamento com confirmação, diálogos, foco, classes/atributos ARIA, sidebar desktop/mobile e estado do `EditorStore`.
- Não iniciar Vite, Chrome ou Playwright para QA automático.
- QA visual ou interação real com a aplicação só quando o usuário solicitar explicitamente.
- Novas features de UI devem vir com teste de comportamento; não considerar inspeção visual manual como validação suficiente.

Exceção autorizada: `nav.test.ts` valida os 6 destinos com Editor como view inicial. Testes do editor: `editorStore`, `editorTabs`, `editorSidebar`, `editorGrouping`, `chainDocument`, `appendToChainDialog`, `activeLineHighlight` e `editorView`.
