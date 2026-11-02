import type { NoteContentType } from '@domain/entities/index.js';
import type { ISODateString } from '@shared/types/index.js';

export interface ExampleNote {
  content: string;
  contentType?: NoteContentType | undefined;
  createdAt: ISODateString;
  tags?: string[] | undefined;
}

export interface ExampleChain {
  id: string;
  title: string;
  createdAt: ISODateString;
  tags: string[];
  header: ExampleNote;
  notes: ExampleNote[];
}

export interface ExampleScenario {
  primaryChainId: string;
  chains: ExampleChain[];
}

function at(referenceDate: Date, daysAgo: number, hour: number, minute = 0): ISODateString {
  const date = new Date(referenceDate);
  date.setUTCDate(date.getUTCDate() - daysAgo);
  date.setUTCHours(hour, minute, 0, 0);
  return date.toISOString();
}

export function createExampleScenario(referenceDate: Date = new Date()): ExampleScenario {
  return {
    primaryChainId: 'example-chain-welcome',
    chains: [
      {
        id: 'example-chain-welcome',
        title: 'Bem-vindo ao Notes',
        createdAt: at(referenceDate, 12, 9),
        tags: ['exemplo', 'guia'],
        header: {
          content:
            'Este cenário de exemplo foi criado para você explorar o Notes sem começar do zero. Edite, exclua ou ignore estas coleções quando quiser.',
          createdAt: at(referenceDate, 12, 9),
        },
        notes: [
          {
            content: [
              '### Como o Notes funciona',
              '',
              '- Cada **coleção** reúne notas relacionadas.',
              '- As notas formam uma linha do tempo pesquisável.',
              '- Use tags para cruzar assuntos entre coleções.',
              '',
              'Comece criando uma nota nova ou abrindo uma coleção na lateral.',
            ].join('\n'),
            contentType: 'markdown',
            createdAt: at(referenceDate, 10, 10),
            tags: ['importante'],
          },
          {
            content: [
              'type Nota = { titulo: string; tags: string[] };',
              '',
              'const exemplo: Nota = {',
              '  titulo: "Primeira nota",',
              '  tags: ["projeto", "ideia"],',
              '};',
            ].join('\n'),
            contentType: 'code',
            createdAt: at(referenceDate, 8, 14, 30),
          },
          {
            content: [
              'Atalhos úteis:',
              'N — novo documento',
              'Shift + N — nova coleção',
              'Ctrl + K — pesquisar',
              'Ctrl + S — salvar no editor',
            ].join('\n'),
            createdAt: at(referenceDate, 7, 8),
            tags: ['atalhos'],
          },
        ],
      },
      {
        id: 'example-chain-aurora',
        title: 'Projeto Aurora',
        createdAt: at(referenceDate, 6, 9),
        tags: ['projeto', 'aurora'],
        header: {
          content:
            'Acompanhe decisões, próximos passos e referências do lançamento do produto.',
          createdAt: at(referenceDate, 6, 9),
        },
        notes: [
          {
            content: [
              '## Objetivo',
              '',
              'Lançar a versão beta para um grupo pequeno de usuários e coletar feedback nas duas primeiras semanas.',
              '',
              '### Próximos passos',
              '- [ ] Fechar escopo do beta',
              '- [ ] Preparar roteiro de testes',
              '- [ ] Convidar 20 participantes',
            ].join('\n'),
            contentType: 'markdown',
            createdAt: at(referenceDate, 4, 11),
          },
          {
            content:
              'Decisão: manter o onboarding curto, com uma única pergunta e opção de começar em branco.',
            createdAt: at(referenceDate, 3, 16),
            tags: ['decisão'],
          },
          {
            content: [
              'const beta = {',
              '  público: "20 participantes",',
              '  duração: "2 semanas",',
              '  métricas: ["ativação", "retenção", "feedback qualitativo"],',
              '};',
            ].join('\n'),
            contentType: 'code',
            createdAt: at(referenceDate, 2, 9, 30),
          },
        ],
      },
      {
        id: 'example-chain-references',
        title: 'Referências',
        createdAt: at(referenceDate, 5, 8),
        tags: ['referências', 'pessoal'],
        header: {
          content: 'Links, leituras e ideias para revisitar depois.',
          createdAt: at(referenceDate, 5, 8),
        },
        notes: [
          {
            content: [
              '### Leituras',
              '',
              '- [Designing for the Web](https://designingfortheweb.co.uk/)',
              '- [MDN Web Docs](https://developer.mozilla.org/)',
              '- [Notas atômicas](https://notes.andymatuschak.org/)',
            ].join('\n'),
            contentType: 'markdown',
            createdAt: at(referenceDate, 2, 18),
          },
          {
            content: [
              '### Checklist da semana',
              '',
              '- [ ] Revisar notas da coleção Projeto Aurora',
              '- [ ] Testar a busca por "beta"',
              '- [ ] Organizar as tags',
            ].join('\n'),
            contentType: 'markdown',
            createdAt: at(referenceDate, 1, 9),
            tags: ['revisão'],
          },
          {
            content:
              'Ideia solta: transformar as revisões semanais em uma coleção própria, com uma nota por semana.',
            createdAt: at(referenceDate, 0, 8, 30),
          },
        ],
      },
    ],
  };
}
