# Notes

[![License: GPL-3.0](https://img.shields.io/badge/license-GPL--3.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-339933.svg)](https://nodejs.org/)
[![Demo](https://img.shields.io/badge/demo-online-brightgreen.svg)](https://discimus.github.io/notes/)

Aplicação web de notas pessoais, *offline-first*, baseada em **coleções encadeadas** (chains/threads). Os dados permanecem no navegador do usuário, sem conta e sem servidor.

**[Acessar demo](https://discimus.github.io/notes/)**

## Sumário

- [Funcionalidades](#funcionalidades)
- [Início rápido](#início-rápido)
- [Scripts](#scripts)
- [Atalhos de teclado](#atalhos-de-teclado)
- [Arquitetura](#arquitetura)
- [Persistência](#persistência)
- [Testes](#testes)
- [Contribuindo](#contribuindo)
- [Solução de problemas](#solução-de-problemas)
- [Limitações conhecidas](#limitações-conhecidas)
- [Roadmap](#roadmap)
- [Licença](#licença)

## Funcionalidades

| Recurso             | Descrição                                                  |
|---------------------|------------------------------------------------------------|
| Coleções encadeadas | Cada coleção possui um header e notas (tails) em sequência |
| Markdown            | Escrita e renderização de notas em Markdown                |
| Busca               | Pesquisa global de notas e coleções                        |
| Timeline            | Visão cronológica, sem alterar as coleções                 |
| Editor em abas      | Edição simultânea de múltiplas coleções                    |
| Tags                | Normalizadas e associadas ao header da coleção             |
| Offline-first       | Persistência local via IndexedDB                           |

## Início rápido

**Pré-requisitos**

| Ferramenta | Versão |
|------------|--------|
| Node.js    | 20+    |
| npm        | 10+    |

**Instalação**

```bash
git clone https://github.com/discimus/notes.git
cd notes
npm install
npm run dev
```

Acesse `http://localhost:5173`.

## Scripts

| Comando                 | Descrição                         |
|-------------------------|-----------------------------------|
| `npm run dev`           | Servidor de desenvolvimento       |
| `npm run build`         | Build de produção                 |
| `npm run preview`       | Pré-visualização do build         |
| `npm test`              | Testes unitários e de integração  |
| `npm run test:watch`    | Testes em modo watch              |
| `npm run test:coverage` | Testes com relatório de cobertura |

## Atalhos de teclado

| Atalho       | Ação                                   |
|--------------|----------------------------------------|
| `N`          | Nova coleção (fora de campos de texto) |
| `Ctrl+K`     | Abrir pesquisa                         |
| `Ctrl+Enter` | Salvar nota no compositor              |
| `Escape`     | Fechar modal / voltar à lista          |

## Arquitetura

Organização em camadas, com dependências apontando para o domínio.

```
src/
  domain/          # Entidades, Value Objects, Serviços, Interfaces de repositório
  application/     # Casos de uso, DTOs, Portas (INoteClassifier)
  infrastructure/  # IndexedDB (idb), Repositórios in-memory (testes)
  presentation/    # Estado reativo, Componentes, Renderizador, Estilos MD3
  shared/          # Tipos utilitários, helpers (UUID, datas, texto)
tests/             # Suítes de teste
public/            # Arquivos estáticos
```

**Decisões de domínio**

- `Chain` é o agregado raiz e garante a unicidade do header.
- `NotePosition` é um Value Object que assegura ordenação determinística.
- `TagName` normaliza nomes sem distinção de maiúsculas e acentos.
- `TimelineView` é um modelo de leitura e não altera as coleções.
- `INoteClassifier` é o ponto de extensão para classificadores de IA.

**Invariantes**

1. Toda coleção possui exatamente um header.
2. Tails são sempre adicionadas ao final (posição = `notes.length`).
3. Uma nota pertence a exatamente uma coleção.
4. Coleções arquivadas não aceitam novas notas.
5. Tags são normalizadas (sem duplicatas por capitalização ou acentos).
6. Tags são associadas a headers, não a tails.

## Persistência

IndexedDB via [`idb`](https://github.com/jakearchibald/idb), com schema versionado e suporte a migrações.

| Store       | Conteúdo                      |
|-------------|-------------------------------|
| `chains`    | Coleções                      |
| `notes`     | Notas (header e tails)        |
| `tags`      | Tags normalizadas             |
| `chainTags` | Relação entre coleções e tags |

> Os dados ficam armazenados apenas no navegador. Limpar os dados do site apaga as notas.

## Testes

- Unitários e de integração com Vitest.
- Repositórios in-memory isolam o domínio e a aplicação do IndexedDB.
- Testes E2E ainda não incluídos (ver [Roadmap](#roadmap)).

## Contribuindo

Contribuições são bem-vindas.

1. Abra uma *issue* descrevendo o bug ou a proposta.
2. Faça um *fork* e crie uma branch a partir de `main`:
   ```bash
   git checkout -b feat/nome-da-mudanca
   ```
3. Respeite a separação de camadas e as invariantes de domínio.
4. Inclua testes para o comportamento alterado.
5. Valide localmente:
   ```bash
   npm test && npm run build
   ```
6. Abra um *pull request* descrevendo a motivação e as mudanças.

Diretrizes para agentes de IA estão em [AGENTS.md](AGENTS.md).

## Solução de problemas

| Sintoma                              | Causa provável                          | Ação                                       |
|--------------------------------------|-----------------------------------------|--------------------------------------------|
| Erro na instalação ou no build       | Versão incompatível do Node.js          | Usar Node.js 20+ e npm 10+                 |
| Porta 5173 em uso                    | Outro processo ativo                    | Encerrar o processo ou liberar a porta     |
| Notas desapareceram                  | Dados do site limpos no navegador       | Sem recuperação; exportação ainda ausente  |
| Alterações não aparecem em outra aba | Sem sincronização entre abas            | Recarregar a página                        |

## Limitações conhecidas

- Sem testes E2E (Playwright).
- Classificador de IA não implementado (`NullClassifier` retorna lista vazia).
- Sem exportação/importação de dados.
- Sem sincronização entre abas até o recarregamento.

## Roadmap

- [ ] Classificador TF-IDF para sugestão de tags
- [ ] Testes E2E com Playwright
- [ ] Exportação/importação em JSON
- [ ] Sincronização entre abas (`BroadcastChannel`)
- [ ] Relações entre coleções (referências cruzadas)

## Licença

Distribuído sob a licença [GPL-3.0](LICENSE).
