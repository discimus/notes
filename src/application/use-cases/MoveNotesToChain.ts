import type {
  IAttachmentRepository,
  IChainRepository,
  ITagRepository,
} from '@domain/repositories/index.js';
import type { MoveNotesCommand, NoteDTO } from '../dto/index.js';
import {
  InvariantViolationError,
  NotFoundError,
  ValidationError,
} from '@shared/types/index.js';
import { mapNoteToDTO } from '../mappers/index.js';

export class MoveNotesToChain {
  constructor(
    private readonly chainRepo: IChainRepository,
    private readonly tagRepo: ITagRepository,
    private readonly attachmentRepo: IAttachmentRepository
  ) {}

  async execute(command: MoveNotesCommand): Promise<NoteDTO[]> {
    if (command.sourceChainId === command.targetChainId) {
      throw new ValidationError('Escolha uma coleção de destino diferente.');
    }

    const noteIds = [...new Set(command.noteIds)];
    if (noteIds.length === 0) return [];

    const source = await this.chainRepo.findById(command.sourceChainId);
    if (!source) throw new NotFoundError('Chain', command.sourceChainId);

    const target = await this.chainRepo.findById(command.targetChainId);
    if (!target) throw new NotFoundError('Chain', command.targetChainId);

    if (target.isDeleted() || target.isArchived()) {
      throw new InvariantViolationError(
        'Não é possível mover notas para uma coleção arquivada ou excluída.'
      );
    }

    const notes = noteIds
      .map((noteId) => source.notes.find((note) => note.id === noteId))
      .filter((note): note is NonNullable<typeof note> => note !== undefined);

    if (notes.length === 0) return [];

    const moved = notes.map((note) => {
      source.removeNote(note.id);
      return target.addExistingNote(note);
    });

    await this.chainRepo.moveNotes(source, target, moved);
    await this.tagRepo.moveNoteTags(
      moved.map((note) => note.id),
      target.id
    );
    await this.attachmentRepo.moveNoteAttachments(
      moved.map((note) => note.id),
      target.id
    );

    return moved.map((note) => mapNoteToDTO(note));
  }
}
