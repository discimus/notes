# infrastructure/AGENTS.md — Persistência IndexedDB

## Schema — `src/infrastructure/persistence/schema.ts`

DB: `thread-notes-db` versão `2`. Quatro object stores:

| Store | Key | Índices relevantes |
|---|---|---|
| `chains` | `id` | `by-createdAt`, `by-updatedAt`, `by-archivedAt`, `by-deletedAt` |
| `notes` | `id` | `by-chainId`, `by-chainId-position` (composto), `by-createdAt` |
| `tags` | `id` | `by-normalizedName` (unique) |
| `chainTags` | `[chainId, tagId]` (compound) | `by-chainId`, `by-tagId` |

`getDatabase()` é singleton com lazy init — nunca instancie `openDB` fora deste módulo.

## Repositórios: Idb vs InMemory

| Classe | Onde usar |
|---|---|
| `IdbChainRepository` | Produção (browser) |
| `IdbTagRepository` | Produção (browser) |
| `InMemoryChainRepository` | Testes unitários e de integração |
| `InMemoryTagRepository` | Testes unitários e de integração |

Testes **nunca** usam IDB real. Use `fake-indexeddb` apenas se absolutamente necessário — prefira os InMemory.

## Contrato de persistência — armadilhas frequentes

**`save(chain, notes[])`** — persiste o Chain e suas notas em transação única. Use na **criação**.
```typescript
// ✅ criação
await chainRepo.save(chain, [header]);

// ❌ nunca passe array vazio em criação — quebra a invariante do header no reconstitute
await chainRepo.save(chain, []);
```

**`saveChainOnly(chain)`** — persiste apenas os metadados do Chain (sem tocar nas notas). Use após operações que só mudam o agregado: `archive`, `updateTitle`.

**`saveNote(note)`** — persiste ou atualiza uma nota individual. Use após `chain.appendNote()` ou `note.updateContent()`.

## Migração de schema

Ao adicionar campo obrigatório a uma entidade existente:

1. Incrementar `DB_VERSION` em `schema.ts`.
2. Adicionar bloco `if (oldVersion < N)` no callback `upgrade`.
3. Tratar dados legados no bloco de migração (nunca assumir que o campo existe).
4. Verificar se `InMemoryChainRepository` ou `InMemoryTagRepository` precisam refletir o novo campo.

**Nunca** alterar o schema sem incrementar a versão. O IDB bloqueia upgrades silenciosamente em abas abertas — o handler `blocked()` já trata isso com um `console.warn`.

## Novo repositório concreto

1. Implementar a interface do domínio: `class IdbNomeRepository implements INomeRepository`.
2. Criar `InMemoryNomeRepository` espelhando os métodos para testes.
3. Exportar ambos no barrel `src/infrastructure/repositories/index.ts`.
4. Instanciar no `AppController` (não usar DI container — o projeto não tem um).

## Note.contentType

- `contentType` � opcional no registro persistido; notas antigas s�o lidas como `text` por `Note.reconstitute`.
- N�o � necess�rio incrementar `DB_VERSION`: n�o h� �ndice nem store novo.
- Novas notas e atualiza��es gravam o campo via `Note.toData()`.

## Importa��o de texto

- `ImportTextNote` usa `saveNote` e `saveChainOnly`; n�o h� store nem �ndice novo.
- `createdAt`/`updatedAt` de importa��o reaproveitam os campos existentes em `NoteData`.
- Notas importadas continuam ordenadas por `position` para append e por `createdAt` nas views de timeline/hist�rico.

## Importa��o em lote

- `ImportTextNotes` usa `chainRepo.save(chain, notes)` uma �nica vez para persistir o lote.
- `IdbChainRepository.save` grava cadeia e notas na mesma transa��o.
- `InMemoryChainRepository.save` faz merge das notas existentes e ordena por `position`, alinhado ao IDB.
- N�o h� store, �ndice ou migra��o novos.
