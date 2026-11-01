# infrastructure/AGENTS.md ‚Äî Persist√™ncia IndexedDB

## Schema ‚Äî `src/infrastructure/persistence/schema.ts`

DB: `thread-notes-db` vers√£o `2`. Quatro object stores:

| Store | Key | √çndices relevantes |
|---|---|---|
| `chains` | `id` | `by-createdAt`, `by-updatedAt`, `by-archivedAt`, `by-deletedAt` |
| `notes` | `id` | `by-chainId`, `by-chainId-position` (composto), `by-createdAt` |
| `tags` | `id` | `by-normalizedName` (unique) |
| `chainTags` | `[chainId, tagId]` (compound) | `by-chainId`, `by-tagId` |

`getDatabase()` √© singleton com lazy init ‚Äî nunca instancie `openDB` fora deste m√≥dulo.

## Reposit√≥rios: Idb vs InMemory

| Classe | Onde usar |
|---|---|
| `IdbChainRepository` | Produ√ß√£o (browser) |
| `IdbTagRepository` | Produ√ß√£o (browser) |
| `InMemoryChainRepository` | Testes unit√°rios e de integra√ß√£o |
| `InMemoryTagRepository` | Testes unit√°rios e de integra√ß√£o |

Testes **nunca** usam IDB real. Use `fake-indexeddb` apenas se absolutamente necess√°rio ‚Äî prefira os InMemory.

## Contrato de persist√™ncia ‚Äî armadilhas frequentes

**`save(chain, notes[])`** ‚Äî persiste o Chain e suas notas em transa√ß√£o √∫nica. Use na **cria√ß√£o**.
```typescript
// ‚úÖ cria√ß√£o
await chainRepo.save(chain, [header]);

// ‚ùå nunca passe array vazio em cria√ß√£o ‚Äî quebra a invariante do header no reconstitute
await chainRepo.save(chain, []);
```

**`saveChainOnly(chain)`** ‚Äî persiste apenas os metadados do Chain (sem tocar nas notas). Use ap√≥s opera√ß√µes que s√≥ mudam o agregado: `archive`, `updateTitle`.

**`saveNote(note)`** ‚Äî persiste ou atualiza uma nota individual. Use ap√≥s `chain.appendNote()` ou `note.updateContent()`.

## Migra√ß√£o de schema

Ao adicionar campo obrigat√≥rio a uma entidade existente:

1. Incrementar `DB_VERSION` em `schema.ts`.
2. Adicionar bloco `if (oldVersion < N)` no callback `upgrade`.
3. Tratar dados legados no bloco de migra√ß√£o (nunca assumir que o campo existe).
4. Verificar se `InMemoryChainRepository` ou `InMemoryTagRepository` precisam refletir o novo campo.

**Nunca** alterar o schema sem incrementar a vers√£o. O IDB bloqueia upgrades silenciosamente em abas abertas ‚Äî o handler `blocked()` j√° trata isso com um `console.warn`.

## Novo reposit√≥rio concreto

1. Implementar a interface do dom√≠nio: `class IdbNomeRepository implements INomeRepository`.
2. Criar `InMemoryNomeRepository` espelhando os m√©todos para testes.
3. Exportar ambos no barrel `src/infrastructure/repositories/index.ts`.
4. Instanciar no `AppController` (n√£o usar DI container ‚Äî o projeto n√£o tem um).

## Note.contentType

- `contentType` È opcional no registro persistido; notas antigas s„o lidas como `text` por `Note.reconstitute`.
- N„o È necess·rio incrementar `DB_VERSION`: n„o h· Ìndice nem store novo.
- Novas notas e atualizaÁıes gravam o campo via `Note.toData()`.

## ImportaÁ„o de texto

- `ImportTextNote` usa `saveNote` e `saveChainOnly`; n„o h· store nem Ìndice novo.
- `createdAt`/`updatedAt` de importaÁ„o reaproveitam os campos existentes em `NoteData`.
- Notas importadas continuam ordenadas por `position` para append e por `createdAt` nas views de timeline/histÛrico.

## ImportaÁ„o em lote

- `ImportTextNotes` usa `chainRepo.save(chain, notes)` uma ˙nica vez para persistir o lote.
- `IdbChainRepository.save` grava cadeia e notas na mesma transaÁ„o.
- `InMemoryChainRepository.save` faz merge das notas existentes e ordena por `position`, alinhado ao IDB.
- N„o h· store, Ìndice ou migraÁ„o novos.

## Cadeias headerless

- `ChainData.headerNoteId` È opcional; cadeias antigas continuam com header.
- Cadeias criadas por `CreateChain` gravam sem header e com zero notas.
- `IdbChainRepository.findTimelinePage` consulta o header apenas quando `headerNoteId` existe.
- N„o È necess·rio incrementar `DB_VERSION`: o campo n„o È indexado.
