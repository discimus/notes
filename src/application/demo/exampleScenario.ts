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
            'Bem-vindo ao Notes. Este cenário é um espaço seguro para experimentar: edite, exclua ou ignore as coleções quando quiser. Tudo fica salvo localmente no seu navegador, sem conta e sem enviar conteúdo para servidores.',
          createdAt: at(referenceDate, 12, 9),
        },
        notes: [
          {
            content: [
              '### Como o Notes funciona',
              '',
              '- Cada **coleção** reúne notas relacionadas e aparece na lateral.',
              '- Cada nota guarda a própria data; o histórico agrupa por dia e a timeline cruza coleções.',
              '- Use tags para cruzar assuntos e pesquise tudo com **Ctrl + K**.',
              '- Abra uma nota pelo histórico para editar e salve com **Ctrl + S**.',
              '',
              'Comece criando uma nota nova, abrindo uma coleção ou importando um arquivo.',
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
              'Esc — fechar diálogos e voltar',
              '',
              'Dica: arraste arquivos ou pastas para a lateral de coleções para importar sem sair do editor.',
            ].join('\n'),
            createdAt: at(referenceDate, 7, 8),
            tags: ['atalhos'],
          },
        ],
      },
      {
        id: 'example-chain-import',
        title: 'Importar arquivos e pastas',
        createdAt: at(referenceDate, 9, 9),
        tags: ['importação', 'guia'],
        header: {
          content:
            'Guia rápido para trazer documentos de texto para o Notes, seja um arquivo isolado ou uma estrutura de pastas inteira.',
          createdAt: at(referenceDate, 9, 9),
        },
        notes: [
          {
            content: [
              '### Arquivos avulsos',
              '',
              '- Arraste um ou mais arquivos para uma coleção na lateral ou para a área da coleção aberta.',
              '- Também use o botão de upload no cabeçalho da coleção.',
              '- Cada arquivo vira uma nota anexada ao final da coleção, na ordem em que foi selecionado.',
              '- Arquivos `.md`, `.markdown` e similares são abertos como Markdown; os demais como texto puro.',
            ].join('\n'),
            contentType: 'markdown',
            createdAt: at(referenceDate, 8, 10),
            tags: ['arquivos'],
          },
          {
            content: [
              '### O que é validado',
              '',
              '- Até **50 MB** por arquivo, em UTF-8 e com algum texto.',
              '- Arquivos vazios, binários ou com caracteres inválidos são recusados com o motivo.',
              '- Conteúdo já importado é detectado e ignorado como duplicado.',
              '- O switch **Usar datas dos arquivos** preserva a data original de cada nota no histórico e na timeline.',
            ].join('\n'),
            contentType: 'markdown',
            createdAt: at(referenceDate, 7, 15),
            tags: ['limites'],
          },
          {
            content: [
              '### Pastas inteiras',
              '',
              '- Arraste uma pasta para a lateral ou use **Importar pasta**.',
              '- Por padrão, cada pasta vira uma coleção com as notas dos seus arquivos.',
              '- Subpastas podem virar coleções filhas com prefixo ou ser reunidas na coleção pai.',
              '- Com uma coleção aberta, escolha adicionar os arquivos a ela em vez de criar novas coleções.',
            ].join('\n'),
            contentType: 'markdown',
            createdAt: at(referenceDate, 6, 14),
            tags: ['pastas'],
          },
          {
            content: [
              '### Durante e depois da importação',
              '',
              '- O progresso mostra a pasta atual, arquivos processados, notas importadas, falhas, pastas ignoradas e duplicados.',
              '- Cancelar interrompe o restante, mas mantém as coleções já criadas.',
              '- Ao terminar, abra a coleção criada e ajuste título, tags e conteúdo quando quiser.',
              '- Vale revisar as notas importadas na timeline para dar contexto e conectar ideias.',
            ].join('\n'),
            contentType: 'markdown',
            createdAt: at(referenceDate, 5, 11),
            tags: ['dicas'],
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
