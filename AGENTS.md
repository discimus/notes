# AGENTS.md — Notes

SPA vanilla TS + DDD + Clean Architecture. Build: Vite 5, tsc strict. Persist: IndexedDB (`idb`). Uma dependência de runtime: `idb@8.0.1`.

## Comandos

| Comando | Ação |
|---|---|
| `npm run dev` | Uso manual do usuário; **não** usar para validação automática |
| `npm run build` | tsc (src) + vite build |
| `npm run typecheck` | tsc --noEmit (src + tests) |
| `npm run test` | vitest run |
| `npm run test:coverage` | vitest run --coverage |
| `npm run preview` | Uso manual do usuário; **não** usar para validação automática |

## Validação e limites de execução

- A fonte principal de saúde do projeto são os **testes automatizados**: `npm run test`.
- Definição de pronto:
  1. Testes novos cobrem o comportamento alterado (testes existentes só podem ser atualizados com autorização explícita).
  2. `npm run test` passa com timeout de **120000 ms**.
  3. `npm run build` passa com timeout de **180000 ms**.
- Use `npm run typecheck` apenas para diagnóstico focal de TypeScript, com timeout de **120000 ms**.
- Não repetir indefinidamente comandos que falharem ou estourarem timeout. Pare e reporte o erro.
- Não iniciar servidores, processos em background, watchers ou sessões interativas.
- Não executar `npm run dev`, `npm run preview`, Chrome/Playwright, screenshots ou automação de navegador para validar mudanças.
- QA visual ou interação real com a aplicação só quando o usuário solicitar explicitamente.
- Prefira testes com jsdom/DOM para validar UI, estado, abas, diálogos, foco, teclado e atributos ARIA.

## Documentação

- **NUNCA** editar `AGENTS.md` ou qualquer outro `.md` sem pedido explícito do usuário.
- Se uma regra documentada ficar obsoleta por uma mudança solicitada, proponha a atualização ao usuário em vez de aplicá-la automaticamente.
- Não criar novos arquivos `.md` espontaneamente.
- Quando autorizado, mantenha a documentação mínima e restrita ao comportamento alterado.

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
| `Chain` | `src/domain/entities/Chain.ts` | `chains` | Agregado raiz — coleção de notas |
| `Note` | `src/domain/entities/Note.ts` | `notes` | Nota individual (header ou tail) |
| `Tag` | `src/domain/entities/Tag.ts` | `tags` | Tag associada a coleções |
| `ChainTag` | `src/domain/entities/ChainTag.ts` | `chainTags` | Relação N:N entre Chain e Tag |

## Política de testes

- **NUNCA** modificar testes existentes. Se quebrar, a implementação está errada.
- Criar novos arquivos de teste é obrigatório para comportamento novo.
- Editar, remover ou reescrever testes existentes exige autorização explícita.
- Se um teste existente falhar, corrija a implementação, nunca o teste.
- Toda feature ou correção deve incluir testes proporcionais ao comportamento alterado.
- A validação de UI deve ocorrer por testes jsdom/DOM, não por interação manual com a aplicação.
- Testes unitários de domínio ficam em `tests/unit/domain/` — cobrem entidades e value objects.
- Testes unitários de apresentação ficam em `tests/unit/presentation/` — cobrem helpers de DOM, filtros e componentes sem I/O real.
- Testes de integração ficam em `tests/integration/use-cases/` — usam `InMemoryChainRepository` e `InMemoryTagRepository`, nunca IDB real.
- Ao adicionar nova entidade → adicionar teste de domínio em `tests/unit/domain/`.
- Ao adicionar novo use case → adicionar teste de integração em `tests/integration/use-cases/`.
- Ao alterar UI → cobrir o comportamento em `tests/unit/presentation/` antes de considerar a tarefa concluída.
- `src` é verificado com `tsconfig.json`; `tests` com `tsconfig.test.json` (`noUnused*` desativado apenas nos testes).
- Exceção: `it.skip` com justificativa quando a falha for por limitação de ambiente.
- Se um comportamento não puder ser coberto por teste, documente a limitação e peça validação explícita ao usuário.

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
