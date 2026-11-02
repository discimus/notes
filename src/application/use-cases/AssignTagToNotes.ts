import { NoteTag, Tag } from '@domain/entities/index.js';
import type { Chain } from '@domain/entities/index.js';
import type { IChainRepository, ITagRepository } from '@domain/repositories/index.js';
import type {
  AssignTagToNotesCommand,
  AssignTagToNotesResult,
} from '../dto/index.js';
import { NotFoundError, ValidationError } from '@shared/types/index.js';
import { normalizeText } from '@shared/utilities/index.js';
import { mapTagToDTO } from '../mappers/index.js';

export class AssignTagToNotes {
  constructor(
    private readonly chainRepo: IChainRepository,
    private readonly tagRepo: ITagRepository
  ) {}

  async execute(
    command: AssignTagToNotesCommand
  ): Promise<AssignTagToNotesResult> {
    if (command.notes.length === 0) {
      throw new ValidationError('Selecione pelo menos uma nota.');
    }

    const targets = new Map<string, { chainId: string; noteId: string }>();
    for (const note of command.notes) {
      targets.set(note.noteId, note);
    }

    const chains = new Map<string, Chain>();
    for (const target of targets.values()) {
      if (chains.has(target.chainId)) continue;
      const chain = await this.chainRepo.findById(target.chainId);
      if (!chain) throw new NotFoundError('Chain', target.chainId);
      chains.set(target.chainId, chain);
    }

    for (const target of targets.values()) {
      const chain = chains.get(target.chainId);
      if (!chain?.notes.some((note) => note.id === target.noteId)) {
        throw new NotFoundError('Note', target.noteId);
      }
    }

    const normalizedName = normalizeText(command.tagName);
    let tag = await this.tagRepo.findByNormalizedName(normalizedName);
    if (!tag) {
      tag = Tag.create(command.tagName, 'manual');
      await this.tagRepo.save(tag);
    }

    for (const target of targets.values()) {
      await this.tagRepo.assignToNote(
        NoteTag.create(target.noteId, target.chainId, tag.id)
      );
    }

    const count = await this.tagRepo.countChainsForTag(tag.id);
    return {
      tag: mapTagToDTO(tag, count),
      assigned: targets.size,
    };
  }
}
