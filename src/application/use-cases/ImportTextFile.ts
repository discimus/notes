import type { IChainRepository } from '@domain/repositories/index.js';
import type {
  ImportTextFileCommand,
  ImportTextFileResult,
} from '../dto/index.js';
import { NotFoundError } from '@shared/types/index.js';
import { mapNoteToDTO } from '../mappers/index.js';
import { normalizeImportedDate } from './importDate.js';

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: unknown }).name === 'ConstraintError'
  );
}

export class ImportTextFile {
  constructor(private readonly chainRepo: IChainRepository) {}

  async execute(command: ImportTextFileCommand): Promise<ImportTextFileResult> {
    if (
      command.contentHash &&
      (await this.chainRepo.hasContentHashInChain(
        command.chainId,
        command.contentHash
      ))
    ) {
      return { duplicate: true };
    }

    const chain = await this.chainRepo.findById(command.chainId);
    if (!chain) throw new NotFoundError('Chain', command.chainId);

    const note = chain.appendImportedText(
      command.content,
      normalizeImportedDate(command.sourceCreatedAt),
      {
        ...(command.contentHash ? { contentHash: command.contentHash } : {}),
        ...(command.sourceFileName
          ? { sourceFileName: command.sourceFileName }
          : {}),
      }
    );

    try {
      await this.chainRepo.save(chain, [note]);
    } catch (error: unknown) {
      if (isUniqueConstraintError(error)) {
        return { duplicate: true };
      }
      throw error;
    }

    return { duplicate: false, note: mapNoteToDTO(note) };
  }
}
