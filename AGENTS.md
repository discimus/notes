# AGENTS.md — ThreadNotes

SPA vanilla TS + DDD + Clean Architecture. Build: Vite 5, tsc strict. Persist: IndexedDB (`idb`). Uma dependência de runtime: `idb@8.0.1`.

## Comandos

| Comando | Ação |
|---|---|
| `npm run dev` | Dev server localhost:5173 |
| `npm run build` | tsc + vite build |
| `npm run typecheck` | tsc --noEmit |
| `npm run test` | vitest run |
| `npm run test:coverage` | vitest run --coverage |

**SEMPRE** execute `npm run build && npm run test` ao finalizar uma implementação.

## Aliases de path (tsconfig + vite)

| Alias | Pasta real |
|---|---|
| `@domain/*` | `src/domain/*` |
| `@application/*` | `src/application/*` |
| `@infrastructure/*` | `src/infrastructure/*` |
| `@presentation/*` | `src/presentation/*` |
| `@shared/*` | `src/shared/*` |

Use os aliases. Nunca use caminhos relativos que cruzem camadas (ex: `../../domain` a partir de `presentation`).

## Entidades e persistência

| Entidade | Arquivo | Store IDB | Significado |
|---|---|---|---|
| `Chain` | `src/domain/entities/Chain.ts` | `chains` | Agregado raiz — cadeia de notas |
| `Note` | `src/domain/entities/Note.ts` | `notes` | Nota individual (header ou tail) |
| `Tag` | `src/domain/entities/Tag.ts` | `tags` | Tag associada a cadeias |
| `ChainTag` | `src/domain/entities/ChainTag.ts` | `chainTags` | Relação N:N entre Chain e Tag |

## Política de testes

- **NUNCA** modificar testes existentes. Se quebrar, a implementação está errada.
- Testes unitários ficam em `tests/unit/domain/` — cobrem entidades e value objects.
- Testes de integração ficam em `tests/integration/use-cases/` — usam `InMemoryChainRepository` e `InMemoryTagRepository`, nunca IDB real.
- Ao adicionar nova entidade → adicionar teste de domínio em `tests/unit/domain/`.
- Ao adicionar novo use case → adicionar teste de integração em `tests/integration/use-cases/`.
- Exceção: `it.skip` com justificativa quando a falha for por limitação de ambiente.

## Camadas e responsabilidades

```
src/domain/          → regras de negócio puras, sem I/O
src/application/     → orquestra o domínio, define use cases e DTOs
src/infrastructure/  → implementações concretas (IndexedDB)
src/presentation/    → UI vanilla DOM + estado reativo + CSS
src/shared/          → tipos primitivos e utilitários sem dependências
```

**Fluxo obrigatório:** `presentation → application (use cases) → domain ← infrastructure`

Nunca pule camadas. `AppController` é o único ponto de entrada da presentation para use cases.

## Subpastas com AGENTS.md

| Arquivo | Quando ler |
|---|---|
| `src/shared/AGENTS.md` | Antes de usar erros, utilitários ou tipos primitivos |
| `src/domain/AGENTS.md` | Antes de criar ou modificar entidades, VOs ou repositórios |
| `src/infrastructure/AGENTS.md` | Antes de tocar em IDB, schema ou repositórios concretos |
| `src/presentation/AGENTS.md` | Antes de modificar UI, estado ou CSS |
