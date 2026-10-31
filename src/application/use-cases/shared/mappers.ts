import type { Chain, Note, Tag } from '../../../domain/entities/index.js';
import type { NoteDTO, ChainDetailDTO, ChainSummaryDTO, TagDTO } from '../../dto/index.js';
import type { TagSuggestion } from '../../ports/index.js';
import { excerpt } from '../../../shared/utilities/index.js';

export function mapNoteToDTO(note: Note): NoteDTO {
  return {
    id: note.id,
    content: note.content,
    chainId: note.chainId,
    position: note.position.value,
    role: note.role,
    ...(note.title ? { title: note.title } : {}),
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

export function mapTagToDTO(tag: Tag, chainCount: number): TagDTO {
  return {
    id: tag.id,
    name: tag.name.value,
    normalizedName: tag.name.normalized,
    createdAt: tag.createdAt,
    origin: tag.origin,
    chainCount,
  };
}

export function mapChainToSummary(
  chain: Chain,
  tagIds: string[],
  tags: Array<{ id: string; name: string; normalizedName: string; createdAt: string; origin: string; chainCount: number }>
): ChainSummaryDTO {
  const headerNote = chain.notes.find((n) => n.isHeader());
  return {
    id: chain.id,
    displayTitle: chain.displayTitle,
    noteCount: chain.noteCount,
    createdAt: chain.createdAt,
    updatedAt: chain.updatedAt,
    ...(chain.archivedAt ? { archivedAt: chain.archivedAt } : {}),
    isFavorite: chain.isFavorite,
    tagIds,
    tags: tags as TagDTO[],
    headerExcerpt: headerNote ? excerpt(headerNote.content, 100) : '',
  };
}

export function mapChainToDetail(
  chain: Chain,
  notes: Note[],
  tagIds: string[],
  tags: Array<{ id: string; name: string; normalizedName: string; createdAt: string; origin: string; chainCount: number }>,
  _suggestions?: TagSuggestion[]
): ChainDetailDTO {
  return {
    ...mapChainToSummary(chain, tagIds, tags),
    notes: notes.map(mapNoteToDTO),
  };
}
