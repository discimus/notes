# Notes

Aplicação web de notas pessoais baseada no conceito de **cadeias encadeadas (chains/threads)**.

## Pré-requisitos

- Node.js 20+
- npm 10+

## Executar em desenvolvimento

```bash
npm install
npm run dev
```

Acesse `http://localhost:5173`.

## Build de produção

```bash
npm run build
npm run preview
```

## Testes

```bash
# Unitários e integração (execução única)
npm test

# Com watch
npm run test:watch

# Com cobertura
npm run test:coverage
```

## Atalhos de teclado

| Atalho | Ação |
|--------|------|
| `N` | Nova cadeia (fora de campos de texto) |
| `Ctrl+K` | Abrir pesquisa |
| `Ctrl+Enter` | Salvar nota no compositor |
| `Escape` | Fechar modal / voltar à lista |

## Arquitetura

```
src/
  domain/          # Entidades, Value Objects, Serviços, Interfaces de repositório
  application/     # Casos de uso, DTOs, Portas (INoteClassifier)
  infrastructure/  # IndexedDB (idb), Repositórios in-memory (testes)
  presentation/    # Estado reativo, Componentes, Renderizador, Estilos MD3
  shared/          # Tipos utilitários, helpers (UUID, datas, texto)
```

### Decisões de domínio

- `Chain` é o agregado raiz — garante invariantes de unicidade do header
- `NotePosition` é um Value Object que assegura ordenação determinística
- `TagName` normaliza nomes insensíveis a maiúsculas e acentos
- `TimelineView` é um modelo de leitura — não altera as cadeias originais
- `INoteClassifier` é o ponto de extensão para classificadores IA futuros

### Invariantes implementadas

1. Toda cadeia possui exatamente um header
2. Tails são sempre adicionadas ao final (posição = notes.length)
3. Uma nota pertence a exatamente uma cadeia
4. Cadeias arquivadas não aceitam novas notas
5. Tags são normalizadas (sem duplicatas por capitalização/acentos)
6. Tags associadas a headers, não diretamente a tails

## Persistência

IndexedDB via `idb` (wrapper leve). Schema versionado com suporte a migrações.
Stores: `chains`, `notes`, `tags`, `chainTags`.

## Limitações conhecidas

- Sem suporte a Playwright (E2E) nesta versão — instalação manual necessária
- Classificador IA não implementado (NullClassifier retorna lista vazia)
- Sem exportação/importação de dados nesta versão
- Sem sincronização entre abas (dados são locais por aba até recarregar)

## Próximos passos recomendados

1. Implementar classificador TF-IDF simples para sugestão de tags
2. Adicionar testes E2E com Playwright para os fluxos principais
3. Adicionar exportação/importação JSON
4. Implementar sincronização de estado entre abas (BroadcastChannel)
5. Adicionar suporte a Markdown no conteúdo das notas
6. Implementar relações entre cadeias (referências cruzadas)
