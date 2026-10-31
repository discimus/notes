# shared/AGENTS.md — Tipos e Utilitários

Fonte: `src/shared/types/index.ts` e `src/shared/utilities/`.

## Erros de domínio — use sempre a hierarquia tipada

```typescript
// ✅ correto
throw new ValidationError('O conteúdo não pode ser vazio.');
throw new NotFoundError('Chain', id);
throw new InvariantViolationError('Cadeia deve ter exatamente um header.');

// ❌ errado — perde informação de tipo e code
throw new Error('mensagem');
```

| Classe | `code` | Quando usar |
|---|---|---|
| `ValidationError` | `VALIDATION_ERROR` | Input inválido (conteúdo vazio, formato errado) |
| `NotFoundError` | `NOT_FOUND` | Entidade não encontrada por ID |
| `InvariantViolationError` | `INVARIANT_VIOLATION` | Quebra de regra estrutural do domínio |

Todas herdam de `DomainError` (que herda de `Error`). Use `instanceof DomainError` para captura genérica.

## Result<T, E> — para operações que podem falhar de forma controlada

```typescript
// Produzir
return ok(data);      // Result<T, never>
return err(error);    // Result<never, E>

// Consumir
if (result.success) { use(result.data); }
else { handle(result.error); }
```

Prefira `Result` em queries (pode não encontrar). Use `throw` em comandos (falha é exceção).

## Utilitários — `src/shared/utilities/`

| Função | Módulo | Uso |
|---|---|---|
| `generateId()` | `id.ts` | Gera UUID v4 — use em todas as factories de entidade |
| `now()` | `date.ts` | Retorna `ISODateString` atual — use em todos os timestamps |
| `normalizeText(text)` | `text.ts` | Lowercase + sem acentos + trim — use antes de comparar/salvar nomes de tag |
| `excerpt(content, max?)` | `text.ts` | Prévia truncada com `…` (default 120 chars) |
| `escapeHtml(text)` | `text.ts` | Escape para renderização segura no DOM |
| `highlightMatch(text, query)` | `text.ts` | Retorna HTML com `<mark>` — usar apenas na camada de apresentação |
| `debounce(fn, delay)` | `text.ts` | Debounce genérico — usar em inputs de busca |

Importe sempre via barrel: `import { generateId, now } from '@shared/utilities/index.js'`.

## Tipos primitivos

- `UUID = string` — IDs de entidade
- `ISODateString = string` — timestamps (sempre via `now()`, nunca `new Date().toISOString()` direto)

Nunca crie aliases locais para esses tipos. Use os do `@shared/types/index.js`.
