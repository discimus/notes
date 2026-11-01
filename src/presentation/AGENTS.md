# presentation/AGENTS.md — UI, Estado e CSS

## Estrutura

```
app/shell.ts        → renderApp, subscrição do estado, updateContent e FAB
app/theme.ts        → preferência de tema e aplicação de data-theme
app/settings.ts     → preferências persistidas (confirmação da lixeira)
app/compactMode.ts  → densidade compacta persistida
app/navigation.ts   → histórico (pushState/popstate)
app/editorGrouping.ts → agrupamento puro de notas por data
views/              → nav, editor, chains, search, timeline, tags, menus
components/         → Dialog, EditorTabs, EditorSidebar, DraftDocument, ChainDocument, ActiveLineHighlight, InlineTagEditor, ChainListItem, AppendToChainDialog, CloseTabDialog, SettingsDialog, Snackbar, states
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
await AppController.createChain(title);

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

**Views disponíveis** (`AppView`): `'editor' | 'chains' | 'chain-detail' | 'search' | 'timeline' | 'tags' | 'archived' | 'trash'`

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
editorStore.openChainTab(chainId, title, { preview?, composerCollapsed? })
editorStore.selectTab(id)
editorStore.updateDraftContent(id, content)
editorStore.createChainNoteTab(chainTabId)
editorStore.openChainNoteEditTab(chainTabId, note)
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
- `ChainTab.preview`: prévia substituível aberta por clique simples na sidebar. Existe no máximo uma; ao abrir outra, a prévia limpa é substituída na mesma posição. Duplo clique, `Ctrl/Cmd+Enter` ou conteúdo dirty promovem a aba a persistente.
- Aberturas programáticas — criar, importar, salvar e abrir pela view de cadeias — usam `preview: false`; somente a sidebar do editor solicita `preview: true`.
- A prévia é persistida no `sessionStorage`; `normalizeChainTab` restaura dados antigos como persistentes e nunca mantém prévia com nota pendente.
- Cobertura: `editorStorePreviewTabs`, `editorSidebarPreview` e `editorTabsPreview`.
- `ChainNoteTab`: nota ainda não persistida ou edição de nota existente. Abas novas viram uma nova tail ao salvar; abas de edição têm `editingNoteId`, `baseContent` e `baseContentType`, e atualizam a nota original.
- `isChainNoteTabDirty` usa `baseContent`/`baseContentType` para abas de edição e conteúdo não vazio para abas novas.
- O dirty state da `ChainTab` é agregado de todas as `ChainNoteTab`.
- Persiste abas, aba ativa e notas pendentes em `sessionStorage` (`threadnotes.editor.tabs`) com debounce. Notas já persistidas são recarregadas do IndexedDB.
- `openChainInEditor`, `loadEditorChainTab`, `appendToEditorChainTab`, `saveEditorToChain` e `updateEditorNote` vivem no `AppController`.
- `Ctrl+S`, `beforeunload`, sidebar mobile e foco das notas ficam na view Editor/sessão, não em `main.ts`.

## Edição de nota existente

- O botão `Editar nota` do histórico não abre mais editor inline; ele cria/seleciona uma aba de edição no compositor de novo documento.
- `openChainNoteEditTab` impede duplicata por `note.id`, remove abas novas vazias, expande o compositor e carrega conteúdo e `contentType` da nota.
- Abas de edição convivem com abas novas pendentes no mesmo tab bar e usam ícone `edit`.
- O compositor mostra placeholder e status de edição, botão `Salvar` e ícone `save`; notas novas continuam com `Adicionar`.
- Ao salvar, `AppController.updateNoteContent` atualiza a nota original. Se retornar sucesso, a aba de edição é removida, uma aba vazia é garantida e o compositor permanece aberto.
- Abas de edição persistem em `sessionStorage` e entram no dirty state/badge; fechar com alterações reutiliza `showCloseTabDialog`.
- Ao abrir uma edição, abas novas vazias ("Novo documento") são removidas do tab bar. Ao fechar a última aba de notas (edição ou novo documento), o compositor inteiro é recolhido em vez de recriar uma aba vazia; salvar mantém o compositor aberto com uma aba nova.
- `saveAllChainNoteTabs` atualiza abas de edição e anexa apenas abas novas.
- A nota em edição recebe o chip `Em edição` no histórico.
- Cobertura: `editorStoreEditNote`, `editorEditNote`, `editorEditNoteClose`, `chainDocumentContentType` e `chainNoteBody`.

## Cadastro de cadeia

- O modal `showComposerModal` solicita apenas o título, obrigatório, com validação inline.
- Conteúdo e tags não fazem parte do cadastro inicial; tags continuam disponíveis no documento.
- O fluxo usa `CreateChain` e cria uma cadeia headerless com `0 notas`.
- A primeira nota posterior é uma tail na posição 1, nunca header.
- O botão “Nova cadeia” do compositor legado abre o mesmo modal.
- Cobertura: `createChainDialog`, `HeaderlessChain`, `CreateEmptyChain` e `emptyChainDocument`.

## Salvar rascunho em uma cadeia

- `AppendToChainDialog` busca cadeias com `normalizeText`.
- Texto digitado sem correspondência exata exibe `Criar cadeia`; o clique cria e salva imediatamente.
- Correspondência exata normalizada oculta a criação para evitar duplicata.
- `Enter` confirma a seleção/correspondência exata ou cria a nova cadeia quando aplicável.
- Criação usa `CreateChainWithNote` para persistir cadeia + primeira tail atomicamente.
- A nova cadeia é headerless; a nota fica na posição 1.
- Cobertura: `appendToChainDialogCreate`, `CreateChainWithNote` e `editorCreateChainFromDraft`.

## Timeline paginada

- A timeline é montada somente após o usuário selecionar ao menos uma cadeia; não há botão “Ver cronologia”.
- `GetTimelinePage` consulta `ITimelineQueryRepository` com página de 50 notas e filtros de texto, período e tags.
- Tags usam semântica **OR** entre si e **AND** com as cadeias selecionadas; a resolução fica no use case, não na view.
- O scroll carrega páginas incrementalmente, mas a janela renderizada é limitada a 200 entradas.
- O slider navega por offsets de página; ao carregar mais, a página inicial da janela avança quando entradas antigas são descartadas.
- A view não persiste o listener após ser removida; o debounce da busca valida a presença de `#timeline-query` antes de disparar.
- Ao entrar na timeline com cadeias selecionadas, o controller recarrega a primeira página para refletir notas novas.
- Cobertura: `tests/unit/presentation/timelineView.test.ts` e `tests/integration/use-cases/GetTimelinePage.test.ts`.

## Cache de rascunhos pendentes

- `sessionStorage` (`threadnotes.editor.tabs`) mantém o workspace completo para reload imediato.
- `localStorage` (`threadnotes.editor.pending.v1`) mantém apenas rascunhos e notas pendentes para sobreviver ao fechamento do navegador.
- O snapshot persistente usa `PendingDraftsCache`, com `version` e `savedAt`, e filtra abas vazias ou já salvas.
- Ao iniciar, a sessão atual tem prioridade; o cache persistente é usado apenas quando não há sessão válida.
- `pagehide`, `visibilitychange` e `beforeunload` executam `flush()`.
- O cache persistente compartilha a instalação; múltiplas janelas seguem last-writer-wins.
- Cobertura: `pendingDraftsCache`, `editorStorePendingCache`, `editorPendingRestoreView` e `editorSessionPersistence`.

## Ações rápidas da cadeia

- O `ChainDocument` usa um footer absoluto, centralizado no fundo e fora da área de scroll. No modo leitura (`chain-document--notes-collapsed`), o documento não reserva faixa inferior: o scroll ocupa a altura toda e o conteúdo passa atrás do footer transparente, com `--chain-actions-overlay-space` no padding inferior do scroll. Com o compositor aberto, o footer de ações fica oculto e não há reserva adicional.
- A row do header (tags, contador, importar e mais) colapsa com `chain-document--header-hidden` usando o mesmo estado de direção do scroll: `grid-template-rows` de `1fr` para `0fr`, padding e borda zerados, `opacity`/`visibility` com atraso e `pointer-events: none`. A guarda de foco impede o colapso enquanto o foco está dentro do header.
- As ações são FABs MD3 com 56×56, raio de 16dp, elevação `level-1`, `surface-container-high` e state layer de 8%/12%; apenas `Documento` é funcional.
- O FAB principal usa `primary-container`/`on-primary-container`; ícone e descrição ficam empilhados, com a descrição abaixo.
- Imagem, áudio e link ficam `disabled` com indicação `Em breve`.
- No modo leitura, as labels das ações usam um chip discreto de `surface-container-lowest` para manter contraste sobre o conteúdo que passa atrás.
- `Documento` abre o compositor quando recolhido, reutilizando uma nota pendente vazia via `ensureChainNoteTab` e focando o textarea. Com o editor aberto, o footer de ações fica oculto; fechar a última aba recolhe o compositor.
- Não há mais recolhimento por `pointerdown` fora do compositor. Cliques na lista abrem ou alternam a aba de edição da nota; o editor permanece disponível.
- Não existe mais o header “Notas em edição”; `aria-expanded` e `aria-controls` do FAB controlam o `#chain-composer-body`.
- Abrir uma cadeia pelo `AppController` usa `openChainTab(chainId, title, { composerCollapsed: true })`; na primeira carga das notas, a edição da nota mais recente é aberta automaticamente sem roubar o foco.
- O dot badge `#chain-unsaved-badge` aparece quando há nota pendente não salva; o `aria-label` da ação informa a contagem.
- Ao rolar para baixo (`scrollTop > 24` e delta > 4), o footer recebe `chain-document--actions-compact`: os FABs diminuem e as descrições são ocultadas no modo leitura. Com o compositor aberto, o footer fica oculto; ao recolher, volta ao estado normal.
- Ao rolar para cima pelo menos 8 px, a expansão ocorre depois de 120 ms; no topo (`scrollTop <= 8`) a expansão é imediata.
- Rolagem programática inicial até a última nota é ignorada pela lógica de compactação.
- O rótulo de data é um badge sticky com fundo `secondary-container` e texto `on-secondary-container`; ele permanece visível durante o scroll para manter o contexto temporal.
- O estado vazio do Editor ("Nenhum documento aberto") reutiliza o mesmo grupo de ações via `QuickActions`, sem badge, `aria-controls` ou `aria-expanded`; `Documento` cria um rascunho.
- Cobertura: `chainQuickActions`, `chainActionsComposerOpen`, `chainHeaderVisibility`, `chainNoteEditorColumn`, `editorQuickActions`, `editorEmptyQuickActions` e `editorStoreComposerOption`.

## Configurações

- A engrenagem `#settings-toggle` fica no rodapé do rail/drawer, acima do tema.
- A modal usa `mountDialog`, aplica alterações imediatamente e mantém `#settings-dialog`, `#settings-status` e `#settings-done`.
- A UI é gerada a partir de `src/presentation/settings/registry.ts` e das definições em `src/presentation/settings/definitions/`.
- Seções atuais: Aparência, Notas e Comportamento. Novas seções/definições devem ser adicionadas ao registry, sem editar o HTML da modal.
- A navegação usa `role="tablist"` com roving tabindex; vertical no desktop e horizontal no mobile.
- Controles reutilizáveis ficam em `src/presentation/components/settings/SettingsControls.ts`: switch MD3 para toggles e fieldset/radio para escolhas.
- Cada definição deve declarar `id`, seção, label, descrição, controle, valor padrão, `get`/`set` e `keywords` para busca futura.
- Persistência continua nas chaves legadas:
  - `threadnotes.theme`
  - `threadnotes.compact-mode`
  - `threadnotes.notes.full-content`
  - `threadnotes.notes.image-layout`
  - `threadnotes.settings` para `confirmBeforeTrash`
- O registry usa adapters sobre os módulos atuais; não há storage v2 nesta etapa.
- Tema e modo compacto continuam com atalhos no rodapé da navegação, usando os mesmos setters da modal.
- `threadnotes.settings.confirmBeforeTrash` controla apenas mover cadeias para a lixeira. Exclusão permanente, remoção de tags e arquivamento continuam sempre confirmando.
- Cobertura: `settingsRegistry`, `settingsNavigation`, `settingsDialog`, `settingsAppearance`, `settingsNoteContent` e `settingsImageLayout`.

## Realce da linha ativa

- `ActiveLineHighlight` é usado nos textareas de documento e de nota da cadeia.
- O foco do textarea **não** usa `outline`; o indicador visual é a linha ativa + caret.
- A posição é calculada com espelho oculto do textarea, considerando quebra automática, scroll, fonte e padding.
- O componente deve ser destruído no teardown da view para remover listeners, `ResizeObserver` e elementos auxiliares.
- A camada é `aria-hidden`, `pointer-events: none` e não interfere em seleção, IME ou undo nativo.

## Tags inline

- `ChainDocument` usa `InlineTagEditor` para adicionar tags sem modal.
- O botão “+ Tag” vira um input dentro de um contêiner com aparência de chip; nunca aninhar `<input>` dentro de `<button>`.
- `Enter` adiciona e mantém o foco; `blur` com valor válido adiciona e fecha; `blur` vazio fecha; `Escape` cancela.
- Erros de validação e duplicatas ficam inline, sem perder o texto digitado.
- O componente preserva o input ativo durante updates da cadeia e deve ser destruído no teardown.
- Autocomplete usa `filterTagSuggestions` com prefixo normalizado, exclui tags já associadas e mostra até 6 opções. Setas navegam, Enter seleciona a opção destacada e sem destaque cria a tag digitada.
- A lista de sugestões é um portal fixo no `body`, com `role="listbox"` e `aria-activedescendant`.

## Modo compacto

- Preferência separada em `threadnotes.compact-mode`, via `app/compactMode.ts`.
- `AppState.compactMode` aplica `app-shell--compact`.
- O modo altera apenas densidade: larguras, alturas, paddings e gaps.
- **Não** ocultar navegação, sidebar, abas ou qualquer elemento estrutural.
- Controle no rodapé da navegação (`#compact-toggle`), com `aria-pressed` e labels dinâmicos.
- O estado é independente do recolhimento do rodapé de notas da cadeia.

## Tipo de conteúdo

- `NoteContentType = 'text' | 'code'` é uma propriedade da nota/documento, não uma preferência global.
- O seletor fica no canto inferior direito: statusbar do rascunho e rodapé do compositor da cadeia.
- Usa `ContentTypeMenu` (menu MD3 com `menuitemradio`), não `<select>` nativo.
- Texto mantém `spellcheck`; código usa fonte monoespaçada, `spellcheck=false`, `tab-size: 2` e preserva whitespace.
- `EditorStore` persiste `contentType` em `DraftTab`/`ChainNoteTab` e restaura dados antigos como `text`.
- Notas de código no histórico usam o compositor para edição, com fonte mono, `spellcheck=false` e `tab-size: 2`; não há mais editor inline.
- Cobertura: `contentTypeMenu`, `editorStoreContentType`, `documentContentTypeView`, `chainDocumentContentType`, `editorStoreEditNote`, `editorEditNote` e `NoteContentType`.

- Role o scroll sobre o seletor para alternar entre Texto e Código sem abrir o menu; o gesto tem cooldown para não alternar várias vezes.

## Links em notas

- `LinkedText` renderiza texto e código com links derivados de `findLinks`; `MarkdownContent` renderiza Markdown sanitizado.
- A fonte de verdade continua sendo texto puro. Não persistir HTML nem alterar o conteúdo salvo ao linkificar.
- Apenas `http://`, `https://` e `www.` são detectados; `www.` recebe `https://`. Protocolos inseguros são ignorados.
- Links usam a classe `note-link`, âncoras reais, `target="_blank"`, `rel="noopener noreferrer"` e `referrerpolicy="no-referrer"`.
- O padrão é minimalista: cor `primary`, sem ícone externo e sem sublinhado permanente; sublinhado em hover/focus e outline de foco MD3.
- Clique simples, teclado e toque abrem em nova aba. Não existe mais o modificador Ctrl/Cmd exclusivo.
- URLs em notas de código são linkificadas genéricamente, inclusive em strings e comentários, pois a linguagem não é armazenada.
- O histórico da cadeia e a timeline usam o mesmo padrão. O detalhe da cadeia mantém texto puro por causa da edição inline em `contentEditable`.
- Markdown usa `html: false`; HTML bruto não é renderizado e apenas links/imagens HTTP(S) são permitidos.
- Não usar `innerHTML` para linkificar conteúdo do usuário fora do renderizador Markdown sanitizado.
- Cobertura: `linkify`, `noteLinks`, `markdownContent` e `timelineLinks`.

## Importação de documentos externos

- DnD é exclusivo para arquivos externos; abas internas não são arrastáveis.
- Destinos: item de cadeia na sidebar e área da cadeia aberta no Editor.
- Limite: 256 KiB por arquivo, até 10 arquivos e 1 MiB por lote; UTF-8 válido, sem NUL/binário e sem conteúdo vazio.
- Todo arquivo é tratado como texto puro; nunca renderizar o conteúdo como HTML.
- Cada arquivo vira uma tail separada, na ordem do `FileList`.
- Um arquivo usa `ImportTextDialog`; 2+ usam `ImportTextFilesDialog`.
- O lote mostra HEAD de 5 linhas por arquivo e expansão para o conteúdo integral.
- Arquivos inválidos aparecem com falha e motivo; somente válidos são importados.
- File.lastModified é a data de cada arquivo. O switch “Usar datas dos arquivos” é global, mas cada nota recebe sua própria data; ausência/invalidez/futuro usa `now()`.
- A nota é sempre anexada como última tail; com data antiga, aparece na timeline naquela data.
- Fallback acessível: botão upload_file no header da cadeia abre um seletor múltiplo e usa o mesmo preview.
- Estado de drag é local à view; não usar AppState.
- Cobertura: `textFileImport`, `textFileImportBatch`, `importTextDialog`, `importTextFilesDialog`, `editorSidebarFileDrop`, `chainDocumentImport`, `editorImportView`, `ImportTextNote` e `ImportTextNotes`.

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
- Lista de cadeias: item compacto de 2 linhas, com título + data/notas + botão de pin. Excerpt e tags ficam no detalhe, não na lista.
- Cadeias fixadas são preferência de UI (`threadnotes.pinned-chains`) e aparecem primeiro na sidebar; não há mais view nem campo de favoritos.
- Tokens MD3: use `var(--md-sys-color-primary)` etc. — nunca valores de cor literais.
- **Nunca** ler `components.css` inteiro — use grep para a classe específica.
- Navegação: rail fixo de 80px em `≥769px`; drawer modal de 280px em `≤768px`. A lupa é o primeiro item da navegação (`data-view="search"`) e preserva o atalho `Ctrl+K`. Não existe topbar; o título acessível da view fica em `#app-view-title` com `.sr-only`. No mobile, o botão `.nav-toggle` é renderizado dentro dos headers já existentes de cada view, sem criar uma row nova. Configurações, tema e modo compacto ficam no rodapé do rail/drawer.
- A navegação não deve ter scroll próprio: conteúdo com `overflow: hidden`, itens de 52px, footer com botões de 48px e dimensões ajustadas para caber sem rolagem.
- Workspace Editor: lateral de 300px no desktop e off-canvas no compacto. O botão `#editor-explorer-toggle` abre/fecha a lateral no mobile; overlay usa o scrim MD3.
- O documento e o histórico da cadeia permanecem full-bleed, sem centralização, borda ou raio de card. O histórico usa medida de leitura de ~72ch alinhada à esquerda para linhas confortáveis. A sidebar de cadeias permanece fixa como Explorer.
- Abas usam `role="tablist"`; o documento ativo é `role="tabpanel"`. O compositor da cadeia é o único ponto que cria novas tails na view principal.
- `renderTabList`: duplo clique no espaço vazio cria nova aba (`onCreate`); clique com botão do scroll fecha a aba (`auxclick`, botão 1). Esses atalhos complementam, não substituem, os botões e o teclado.
- O mesmo atalho de nova aba vale para o fundo da row `.editor-tabbar`; duplo clique em abas ou botões da row é ignorado.
- Abas de cadeia são renomeáveis: duplo clique no label ou item “Renomear” do menu. O título vira input inline; Enter salva, Escape/blur cancelam.
- Abas de prévia usam `.editor-tab--preview` com label em itálico, `aria-description` e tooltip; não adicionam ícones extras. Ao serem promovidas ou ficarem dirty, a classe é removida na atualização.
- O header do `ChainDocument` não repete o título; exibe tags, contador, Importar e Mais.
- Cobertura: `editorTabRename`, `chainMenuRename` e `editorChainRename`.
- O compositor de notas fica dentro de `.chain-document__body`: em containers `≥640px` o body é grid com a lista à esquerda e o editor à direita; em containers estreitos o editor fica abaixo da lista. `ChainTab.composerCollapsed` controla a visibilidade e `hidden`/ARIA continuam válidos.
- Com o compositor aberto, o editor ocupa toda a coluna direita e o footer de ações fica oculto; fechar a última aba recolhe o compositor e reexibe as ações. No container estreito, o editor é uma seção inferior com o estilo de bottom sheet tonal; no desktop vira painel lateral com borda esquerda.
- A nota mais recente é aberta automaticamente em uma aba de edição (`focus: false`) na carga; clicar no corpo ou no botão de editar abre ou seleciona a aba correspondente. A seleção visual da lista deriva da aba de edição ativa.
- Não existe mais painel de prévia somente leitura. Os textos da lista são limitados a 3 linhas e o código a 4 linhas somente no layout de duas colunas; o estado selecionado usa `surface-container-low` e o código selecionado usa `surface-container`.

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

Exceção autorizada: `nav.test.ts` valida a busca e os 5 destinos com Editor como view inicial. Testes do editor: `navToggle`, `mobileNavEntries`, `editorStore`, `editorStoreEditNote`, `editorTabs`, `editorSidebar`, `editorGrouping`, `chainDocument`, `chainNoteBody`, `chainNoteReadingFlow`, `chainHeaderVisibility`, `chainNoteEditorColumn`, `editorEditNote`, `editorEditNoteClose`, `noteLinks`, `linkModifier`, `appendToChainDialog`, `activeLineHighlight`, `inlineTagEditor`, `tagSuggestions`, `pinnedChains`, `editorView` e `timelineView`.
