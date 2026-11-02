import type { IChainRepository } from '@domain/repositories/index.js';
import type {
  ImportTextDocumentInput,
  ImportTextNotesCommand,
  NoteDTO,
} from '../dto/index.js';
import { NotFoundError, ValidationError } from '@shared/types/index.js';
import { mapNoteToDTO } from '../mappers/index.js';
import { normalizeImportedDate } from './importDate.js';
import { importContentTypeFromFileName } from './importContentType.js';

export class ImportTextNotes {
  constructor(private readonly chainRepo: IChainRepository) {}

  async execute(command: ImportTextNotesCommand): Promise<NoteDTO[]> {
    if (command.documents.length === 0) {
      throw new ValidationError('Nenhum documento foi informado para importação.');
    }

    const chain = await this.chainRepo.findById(command.chainId);
    if (!chain) throw new NotFoundError('Chain', command.chainId);

    const seenHashes = new Set<string>();
    const documents: ImportTextDocumentInput[] = [];
    for (const document of command.documents) {
      if (document.contentHash) {
        if (
          seenHashes.has(document.contentHash) ||
          (await this.chainRepo.hasContentHashInChain(
            command.chainId,
            document.contentHash
          ))
        ) {
          continue;
        }
        seenHashes.add(document.contentHash);
      }
      documents.push(document);
    }

    if (documents.length === 0) return [];

    const notes = documents.map((document) =>
      chain.appendImportedText(
        document.content,
        normalizeImportedDate(document.sourceCreatedAt),
        {
          ...(document.contentHash ? { contentHash: document.contentHash } : {}),
          ...(document.sourceFileName
            ? { sourceFileName: document.sourceFileName }
            : {}),
          contentType: importContentTypeFromFileName(document.sourceFileName),
        }
      )
    );

    await this.chainRepo.save(chain, notes);
    return notes.map((note) => mapNoteToDTO(note));
  }
}
