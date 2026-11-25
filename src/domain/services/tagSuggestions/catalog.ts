import { InvariantViolationError } from '@shared/types/index.js';
import { canonicalTagKey } from './canonicalize.js';

export const CATALOG_VERSION = 1;

export interface StandardTagAffinity {
  term: string;
  weight: number;
}

export interface StandardTagDefinition {
  key: string;
  name: string;
  category: string;
  aliases: readonly string[];
  affinities: readonly StandardTagAffinity[];
  prior: number;
}

function defineTag(
  name: string,
  category: string,
  aliases: readonly string[],
  affinities: readonly StandardTagAffinity[]
): StandardTagDefinition {
  return {
    key: canonicalTagKey(name),
    name,
    category,
    aliases,
    affinities,
    prior: 0.2,
  };
}

export const STANDARD_TAGS: readonly StandardTagDefinition[] = Object.freeze([
  defineTag(
    'Aprendizado',
    'Conhecimento',
    ['estudo', 'estudos', 'aprender', 'learning'],
    [
      { term: 'aprendizado', weight: 1 },
      { term: 'estudo', weight: 0.9 },
    ]
  ),
  defineTag(
    'Pesquisa',
    'Conhecimento',
    ['research', 'investigacao', 'investigacao-academica'],
    [{ term: 'pesquisa', weight: 1 }]
  ),
  defineTag(
    'Referência',
    'Conhecimento',
    ['referencia', 'referencias', 'fonte', 'fontes', 'citation'],
    [
      { term: 'referencia', weight: 1 },
      { term: 'fonte', weight: 0.8 },
    ]
  ),
  defineTag(
    'Programação',
    'Desenvolvimento',
    [
      'programacao',
      'desenvolvimento',
      'dev',
      'coding',
      'code',
      'codigo',
      'typescript',
      'javascript',
      'js',
      'ts',
      'csharp',
      'c-sharp',
      'dotnet',
      'aspnet',
      'aspnet-core',
      'entity-framework',
      'ef-core',
      'react',
      'angular',
      'vue',
      'node',
      'nodejs',
      'python',
      'java',
      'php',
      'ruby',
      'golang',
      'rust',
      'sql',
      'html',
      'css',
      'api',
      'backend',
      'frontend',
      'algoritmo',
      'algoritmos',
      'programar',
    ],
    [
      { term: 'typescript', weight: 1 },
      { term: 'javascript', weight: 1 },
      { term: 'csharp', weight: 1 },
      { term: 'dotnet', weight: 1 },
      { term: 'aspnet-core', weight: 1 },
      { term: 'entity-framework', weight: 1 },
      { term: 'react', weight: 0.9 },
      { term: 'node', weight: 0.9 },
      { term: 'sql', weight: 0.9 },
      { term: 'api', weight: 0.7 },
    ]
  ),
  defineTag(
    'Arquitetura',
    'Desenvolvimento',
    [
      'arquitetura',
      'arquitetura-de-software',
      'ddd',
      'domain-driven-design',
      'clean-architecture',
      'solid',
      'design-patterns',
      'microsservicos',
      'microservices',
      'monolito',
      'event-sourcing',
      'cqrs',
    ],
    [
      { term: 'ddd', weight: 1 },
      { term: 'domain-driven-design', weight: 1 },
      { term: 'clean-architecture', weight: 1 },
      { term: 'solid', weight: 0.9 },
      { term: 'microsservicos', weight: 0.9 },
    ]
  ),
  defineTag(
    'Tecnologia',
    'Desenvolvimento',
    [
      'tech',
      'ia',
      'inteligencia-artificial',
      'ai',
      'machine-learning',
      'cloud',
      'nuvem',
      'docker',
      'kubernetes',
      'aws',
      'azure',
      'gcp',
      'linux',
      'windows',
      'devops',
      'infraestrutura',
      'seguranca',
      'ciberseguranca',
      'engenharia',
    ],
    [
      { term: 'ia', weight: 1 },
      { term: 'inteligencia-artificial', weight: 1 },
      { term: 'cloud', weight: 0.9 },
      { term: 'docker', weight: 0.9 },
      { term: 'kubernetes', weight: 0.9 },
      { term: 'devops', weight: 0.9 },
      { term: 'seguranca', weight: 0.7 },
    ]
  ),
  defineTag(
    'Trabalho',
    'Trabalho',
    ['work', 'emprego', 'empresa', 'escritorio', 'corporativo'],
    [
      { term: 'trabalho', weight: 1 },
      { term: 'emprego', weight: 0.9 },
    ]
  ),
  defineTag(
    'Projetos',
    'Trabalho',
    ['projeto', 'projetos', 'project', 'side-project', 'sideproject'],
    [{ term: 'projeto', weight: 1 }]
  ),
  defineTag(
    'Carreira',
    'Trabalho',
    ['career', 'promocao', 'curriculo', 'entrevista', 'linkedin', 'salario'],
    [
      { term: 'carreira', weight: 1 },
      { term: 'promocao', weight: 0.9 },
      { term: 'curriculo', weight: 0.9 },
    ]
  ),
  defineTag(
    'Reuniões',
    'Trabalho',
    [
      'reuniao',
      'reunioes',
      'meeting',
      'daily',
      'retrospectiva',
      'retro',
      'sprint-planning',
      'one-on-one',
      '1-1',
      'alinhamento',
      'sincronizacao',
    ],
    [
      { term: 'reuniao', weight: 1 },
      { term: 'daily', weight: 1 },
      { term: 'retrospectiva', weight: 1 },
      { term: 'sprint-planning', weight: 1 },
      { term: 'one-on-one', weight: 1 },
    ]
  ),
  defineTag(
    'Pessoal',
    'Pessoal',
    [
      'pessoal',
      'vida',
      'diario',
      'journal',
      'familia',
      'saude',
      'hobby',
      'hobbies',
      'reflexao',
      'reflexoes',
      'pensamento',
      'insight',
    ],
    [
      { term: 'pessoal', weight: 1 },
      { term: 'reflexao', weight: 0.8 },
      { term: 'diario', weight: 0.8 },
    ]
  ),
  defineTag(
    'Ideias',
    'Pessoal',
    ['ideia', 'ideias', 'idea', 'brainstorm', 'brainstorming', 'brain-dump'],
    [{ term: 'ideia', weight: 1 }]
  ),
  defineTag(
    'Objetivos',
    'Pessoal',
    ['objetivo', 'objetivos', 'meta', 'metas', 'goal', 'goals', 'okr', 'okrs'],
    [
      { term: 'objetivo', weight: 1 },
      { term: 'meta', weight: 0.9 },
      { term: 'okr', weight: 0.9 },
    ]
  ),
  defineTag(
    'Planejamento',
    'Organização',
    ['plano', 'planos', 'planning', 'roadmap', 'cronograma', 'agenda'],
    [
      { term: 'planejamento', weight: 1 },
      { term: 'roadmap', weight: 0.9 },
      { term: 'cronograma', weight: 0.9 },
    ]
  ),
  defineTag(
    'Tarefas',
    'Organização',
    ['tarefa', 'tarefas', 'todo', 'to-do', 'checklist', 'backlog', 'task', 'tasks'],
    [
      { term: 'tarefa', weight: 1 },
      { term: 'todo', weight: 0.9 },
      { term: 'checklist', weight: 0.9 },
    ]
  ),
  defineTag(
    'Decisões',
    'Organização',
    ['decisao', 'decisoes', 'decision', 'adr', 'tradeoff'],
    [
      { term: 'decisao', weight: 1 },
      { term: 'adr', weight: 0.9 },
    ]
  ),
  defineTag(
    'Documentação',
    'Organização',
    ['documentacao', 'docs', 'readme', 'manual', 'guia', 'guia-tecnico'],
    [
      { term: 'documentacao', weight: 1 },
      { term: 'readme', weight: 0.9 },
      { term: 'guia', weight: 0.8 },
    ]
  ),
  defineTag(
    'Livros',
    'Conteúdo',
    ['livro', 'livros', 'book', 'books', 'leitura', 'reading'],
    [
      { term: 'livro', weight: 1 },
      { term: 'leitura', weight: 0.9 },
    ]
  ),
  defineTag(
    'Artigos',
    'Conteúdo',
    ['artigo', 'artigos', 'article', 'blog', 'post', 'paper', 'papers'],
    [
      { term: 'artigo', weight: 1 },
      { term: 'blog', weight: 0.8 },
      { term: 'paper', weight: 0.9 },
    ]
  ),
  defineTag(
    'Filmes',
    'Conteúdo',
    ['filme', 'filmes', 'movie', 'movies', 'serie', 'series', 'cinema'],
    [
      { term: 'filme', weight: 1 },
      { term: 'serie', weight: 0.9 },
    ]
  ),
  defineTag(
    'Cursos',
    'Conteúdo',
    ['curso', 'cursos', 'course', 'aula', 'aulas', 'treinamento', 'tutorial'],
    [
      { term: 'curso', weight: 1 },
      { term: 'aula', weight: 0.9 },
      { term: 'tutorial', weight: 0.8 },
    ]
  ),
  defineTag(
    'Finanças',
    'Finanças',
    [
      'financa',
      'financas',
      'finance',
      'orcamento',
      'gastos',
      'despesas',
      'dinheiro',
      'economia',
      'economy',
    ],
    [
      { term: 'financa', weight: 1 },
      { term: 'orcamento', weight: 0.9 },
      { term: 'economia', weight: 0.7 },
    ]
  ),
  defineTag(
    'Investimentos',
    'Finanças',
    [
      'investimento',
      'investimentos',
      'investment',
      'acoes',
      'renda-fixa',
      'cripto',
      'criptomoeda',
      'bitcoin',
    ],
    [
      { term: 'investimento', weight: 1 },
      { term: 'acoes', weight: 0.9 },
      { term: 'cripto', weight: 0.9 },
    ]
  ),
  defineTag(
    'Criatividade',
    'Criatividade',
    ['creativity', 'criativo', 'criativa'],
    [{ term: 'criatividade', weight: 1 }]
  ),
  defineTag(
    'Escrita',
    'Criatividade',
    ['writing', 'redacao', 'ensaio', 'poesia'],
    [
      { term: 'escrita', weight: 1 },
      { term: 'redacao', weight: 0.9 },
      { term: 'ensaio', weight: 0.8 },
    ]
  ),
  defineTag(
    'Design',
    'Criatividade',
    ['ux', 'ui', 'usabilidade', 'produto', 'product-design'],
    [
      { term: 'design', weight: 1 },
      { term: 'ux', weight: 0.9 },
      { term: 'ui', weight: 0.9 },
    ]
  ),
]);

const TAGS_BY_KEY = new Map<string, StandardTagDefinition>(
  STANDARD_TAGS.map((tag) => [tag.key, tag])
);

interface AffinityMatch {
  tag: StandardTagDefinition;
  weight: number;
}

const AFFINITIES = new Map<string, AffinityMatch>();

function registerAffinity(term: string, match: AffinityMatch): void {
  const key = canonicalTagKey(term);
  if (!key) return;
  const existing = AFFINITIES.get(key);
  if (existing && existing.tag.key !== match.tag.key) {
    throw new InvariantViolationError(
      `Termo de catálogo duplicado: ${term} (${existing.tag.key} e ${match.tag.key}).`
    );
  }
  if (!existing || existing.weight < match.weight) {
    AFFINITIES.set(key, match);
  }
}

STANDARD_TAGS.forEach((tag) => {
  registerAffinity(tag.name, { tag, weight: 1 });
  tag.aliases.forEach((alias) => registerAffinity(alias, { tag, weight: 0.95 }));
  tag.affinities.forEach((affinity) =>
    registerAffinity(affinity.term, { tag, weight: affinity.weight })
  );
});

export function standardTagByKey(key: string): StandardTagDefinition | null {
  return TAGS_BY_KEY.get(key) ?? null;
}

export function isStandardTagKey(key: string): boolean {
  return TAGS_BY_KEY.has(key);
}

export function findStandardTagForTerm(term: string): AffinityMatch | null {
  return AFFINITIES.get(canonicalTagKey(term)) ?? null;
}

export function standardTagKeys(): string[] {
  return [...TAGS_BY_KEY.keys()];
}

export function affinityKeys(): string[] {
  return [...AFFINITIES.keys()];
}
