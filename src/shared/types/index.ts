export * from './attachment.js';

/** Identificador único baseado em UUID v4 */
export type UUID = string;

/** Timestamp ISO 8601 */
export type ISODateString = string;

/** Resultado de uma operação que pode falhar de forma controlada */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/** Erros de domínio tipados */
export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id: string) {
    super('NOT_FOUND', `${entity} com id "${id}" não encontrado.`);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message);
    this.name = 'ValidationError';
  }
}

export class InvariantViolationError extends DomainError {
  constructor(message: string) {
    super('INVARIANT_VIOLATION', message);
    this.name = 'InvariantViolationError';
  }
}

/** Helper para criar Result de sucesso */
export function ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

/** Helper para criar Result de falha */
export function err<E extends Error>(error: E): Result<never, E> {
  return { success: false, error };
}
