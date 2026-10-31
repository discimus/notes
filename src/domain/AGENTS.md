# domain/AGENTS.md — Domínio Rico

## Estrutura

```
entities/     → Chain (agregado), Note, Tag, ChainTag, TimelineView
value-objects/ → NotePosition, TagName
repositories/ → IChainRepository, ITagRepository, ITimelineQueryRepository (interfaces apenas)
services/     → SearchService, TimelineService (lógica pura sem I/O)
```

Repositórios aqui são **interfaces**. Implementações concretas ficam em `src/infrastructure/`.

## Agregado Chain — invariantes

`Chain` é o único agregado. Todas as operações sobre `Note` passam por ele.

**Invariantes obrigatórias:**
1. Toda cadeia tem **exatamente um** header (`role: 'header'`, `position: 0`).
2. Tails têm `position > 0` e são sempre adicionadas ao final.
3. Uma cadeia arquivada (`archivedAt` definido) não aceita novas notas.
4. Uma cadeia excluída (`deletedAt` definido) não aceita novas notas nem pode ser arquivada.

**Criação — sempre via fábrica estática:**
```typescript
// ✅ correto — cria chain + header atomicamente
const { chain, header } = Chain.createWithHeader({ content, title? });

// ❌ errado — Note.createHeader() existe mas não deve ser chamado fora do Chain
const header = Note.createHeader({ content, chainId }); // viola encapsulamento do agregado
```

**Adicionar nota — sempre via método do Chain:**
```typescript
const tail = chain.appendNote(content); // retorna Note para persistência
// depois: await chainRepo.saveNote(tail) + chainRepo.saveChainOnly(chain)
```

**Reconstrução do IDB:**
```typescript
Chain.reconstitute(chainData, notes[]) // valida invariante do header ao carregar
```

## Ciclo de vida do Chain

```
ativo → arquivado (archivedAt)
ativo → lixeira   (deletedAt)
arquivado → ativo (restore)
lixeira → ativo   (hardRestore)
lixeira → [excluído permanentemente via chainRepo.delete()]
```

Não existe transição direta `arquivado → lixeira`. O código lança `InvariantViolationError` se tentar.

## Value Objects

**`NotePosition`** — inteiro não-negativo. Imutável após criação.
- `NotePosition.header()` → posição 0
- `NotePosition.of(n)` → valida e cria
- `NotePosition.next(current)` → incrementa
- Use `compareTo()` para ordenar notas, não compare `.value` diretamente.

**`TagName`** — normaliza via `normalizeText()` ao criar.
- Max 50 chars, sem espaços (use hífen), não vazio.
- `tagName.value` → nome original, `tagName.normalized` → para lookup no IDB.

## Tag — origem e ciclo de sugestão

`TagOrigin = 'manual' | 'suggested' | 'accepted' | 'rejected'`

Tags criadas pelo usuário → `'manual'`. Tags vindas de classificadores → `'suggested'`.
Só tags `'suggested'` aceitam `markAsAccepted()` / `markAsRejected()` (silencioso para outros origins).

## Padrão: nova entidade de domínio

1. Criar arquivo em `src/domain/entities/NomeEntidade.ts` com classe + interface `NomeEntidadeData` + `toData()`.
2. Exportar no barrel `src/domain/entities/index.ts`.
3. Criar interface `INomeEntidadeRepository` em `src/domain/repositories/`.
4. Exportar no barrel `src/domain/repositories/index.ts`.
5. Adicionar teste em `tests/unit/domain/NomeEntidade.test.ts`.
6. Implementações concretas (Idb + InMemory) ficam em `src/infrastructure/`.

## Proibições

- Nunca importar de `@infrastructure/*` ou `@presentation/*` dentro do domínio.
- Nunca usar `new Date()` diretamente — use `now()` de `@shared/utilities/index.js`.
- Nunca usar `crypto.randomUUID()` diretamente — use `generateId()`.
- Nunca lançar `new Error()` — use a hierarquia de `@shared/types/index.js`.
