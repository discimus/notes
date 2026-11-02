import type { Attachment, Chain, Note, Tag } from '@domain/entities/index.js';
import type {
  AttachmentDTO,
  NoteDTO,
  ChainDetailDTO,
  ChainSummaryDTO,
  TagDTO,
} from '@application/dto/index.js';
import type { TagSuggestion } from '@application/ports/index.js';
import { excerpt } from '@shared/utilities/index.js';

export function mapAttachmentToDTO(attachment: Attachment): AttachmentDTO {
  return {
    id: attachment.id,
    noteId: attachment.noteId,
    chainId: attachment.chainId,
    kind: attachment.kind,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    byteSize: attachment.byteSize,
    ...(attachment.altText ? { altText: attachment.altText } : {}),
    ...(attachment.width ? { width: attachment.width } : {}),
    ...(attachment.height ? { height: attachment.height } : {}),
    ...(attachment.duration ? { duration: attachment.duration } : {}),
    createdAt: attachment.createdAt,
  };
}

export function mapNoteToDTO(
  note: Note,
  attachments: Attachment[] = [],
  tags: TagDTO[] = []
): NoteDTO {
  return {
    id: note.id,
    content: note.content,
    chainId: note.chainId,
    position: note.position.value,
    role: note.role,
    contentType: note.contentType,
    ...(note.title ? { title: note.title } : {}),
    ...(note.sourceFileName ? { sourceFileName: note.sourceFileName } : {}),
    ...(note.contentHash ? { contentHash: note.contentHash } : {}),
    ...(attachments.length > 0
      ? { attachments: attachments.map(mapAttachmentToDTO) }
      : {}),
    ...(tags.length > 0 ? { tags } : {}),
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
  _suggestions?: TagSuggestion[],
  attachments: Attachment[] = [],
  noteTagsByNoteId: Map<string, TagDTO[]> = new Map()
): ChainDetailDTO {
  const attachmentsByNoteId = new Map<string, Attachment[]>();
  for (const attachment of attachments) {
    const list = attachmentsByNoteId.get(attachment.noteId) ?? [];
    list.push(attachment);
    attachmentsByNoteId.set(attachment.noteId, list);
  }

  return {
    ...mapChainToSummary(chain, tagIds, tags),
    notes: notes.map((note) =>
      mapNoteToDTO(
        note,
        attachmentsByNoteId.get(note.id) ?? [],
        noteTagsByNoteId.get(note.id) ?? []
      )
    ),
  };
}
