/**
 * Contrato para classificadores de notas.
 * Permite integração futura com IA sem modificar o domínio.
 *
 * Implementações podem usar desde TF-IDF determinístico
 * até LLMs externos, mantendo o mesmo contrato.
 */
export interface TagSuggestion {
  /** Nome da tag sugerida */
  tagName: string;
  /** Pontuação de confiança entre 0 e 1 */
  confidence: number;
  /** Justificativa opcional */
  rationale?: string;
  /** Origem da sugestão (versão do classificador) */
  classifierVersion: string;
  /** Tipo de origem */
  source: 'tfidf' | 'keyword' | 'llm' | 'manual';
}

export interface ClassificationContext {
  content: string;
  existingTags: string[];
  chainHistory?: string[];
}

export interface INoteClassifier {
  /** Analisa o conteúdo e retorna sugestões de tags */
  classify(context: ClassificationContext): Promise<TagSuggestion[]>;
  /** Identificador da versão do classificador */
  readonly version: string;
  /** Nome legível do classificador */
  readonly name: string;
}

/**
 * Implementação nula: classificador desabilitado.
 * A aplicação funciona normalmente sem um classificador configurado.
 */
export class NullClassifier implements INoteClassifier {
  readonly version = '0.0.0';
  readonly name = 'NullClassifier';

  async classify(_context: ClassificationContext): Promise<TagSuggestion[]> {
    return [];
  }
}
