import { Chain } from '@domain/entities/index.js';
import type { IChainRepository } from '@domain/repositories/index.js';
import type {
  ImportTextDocumentInput,
  ImportTextFolderCommand,
  ImportTextFolderResult,
} from '../dto/index.js';
import { ValidationError } from '@shared/types/index.js';
import { mapChainToDetail, mapNoteToDTO } from '../mappers/index.js';
import { normalizeImportedDate } from './importDate.js';

export class ImportTextFolder {
  constructor(private readonly chainRepo: IChainRepository) {}

  async execute(
    command: ImportTextFolderCommand
  ): Promise<ImportTextFolderResult> {
    if (command.documents.length === 0) {
      throw new ValidationError(
        'Nenhum documento foi informado para importação.'
      );
    }

    const seenHashes = new Set<string>();
    const documents: ImportTextDocumentInput[] = [];
    let duplicates = 0;
    for (const document of command.documents) {
      if (document.contentHash) {
        if (seenHashes.has(document.contentHash)) {
          duplicates += 1;
          continue;
        }
        seenHashes.add(document.contentHash);
      }
      documents.push(document);
    }

    if (documents.length === 0) {
      return { status: 'skipped', duplicates };
    }

    const chain = Chain.create({ title: command.title });
    const notes = documents.map((document) =>
      chain.appendImportedText(
        document.content,
        normalizeImportedDate(document.sourceCreatedAt),
        {
          ...(document.contentHash ? { contentHash: document.contentHash } : {}),
          ...(document.sourceFileName
            ? { sourceFileName: document.sourceFileName }
            : {}),
        }
      )
    );

    await this.chainRepo.save(chain, notes);

    return {
      status: 'created',
      chain: mapChainToDetail(chain, notes, [], []),
      notes: notes.map((note) => mapNoteToDTO(note)),
      duplicates,
    };
  }
}
