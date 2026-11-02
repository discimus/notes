import { openDB } from 'idb';
import type { IDBPDatabase, IDBPTransaction, StoreNames } from 'idb';
import type { NoteData } from '@domain/entities/index.js';
import type { ChainData } from '@domain/entities/index.js';
import type { TagData } from '@domain/entities/index.js';
import type { ChainTagData } from '@domain/entities/index.js';
import type { NoteTagData } from '@domain/entities/index.js';
import type { AttachmentData } from '@domain/entities/index.js';

export const DB_NAME = 'thread-notes-db';
export const DB_VERSION = 8;

export interface NotesDB {
  chains: {
    key: string;
    value: ChainData;
    indexes: {
      'by-createdAt': string;
      'by-updatedAt': string;
      'by-archivedAt': string;
      'by-deletedAt': string;
    };
  };
  notes: {
    key: string;
    value: NoteData;
    indexes: {
      'by-chainId': string;
      'by-chainId-position': [string, number];
      'by-createdAt': string;
      'by-contentHash': string;
      'by-chainId-contentHash': [string, string];
    };
  };
  tags: {
    key: string;
    value: TagData;
    indexes: {
      'by-normalizedName': string;
    };
  };
  chainTags: {
    key: [string, string];
    value: ChainTagData;
    indexes: {
      'by-chainId': string;
      'by-tagId': string;
    };
  };
  noteTags: {
    key: [string, string];
    value: NoteTagData;
    indexes: {
      'by-noteId': string;
      'by-chainId': string;
      'by-tagId': string;
    };
  };
  attachments: {
    key: string;
    value: AttachmentData;
    indexes: {
      'by-chainId': string;
      'by-noteId': string;
    };
  };
  attachmentBlobs: {
    key: string;
    value: { id: string; blob: Blob };
  };
}

type UpgradeTransaction = IDBPTransaction<
  NotesDB,
  StoreNames<NotesDB>[],
  'versionchange'
>;

let _db: IDBPDatabase<NotesDB> | null = null;

function isVersionError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: unknown }).name === 'VersionError'
  );
}

function hasAttachmentSchema(db: IDBPDatabase<NotesDB>): boolean {
  if (
    !db.objectStoreNames.contains('attachments') ||
    !db.objectStoreNames.contains('attachmentBlobs')
  ) {
    return false;
  }

  try {
    const tx = db.transaction('attachments', 'readonly');
    const store = tx.objectStore('attachments');
    const complete =
      store.indexNames.contains('by-chainId') &&
      store.indexNames.contains('by-noteId');
    void tx.done.catch(() => undefined);
    return complete;
  } catch {
    return false;
  }
}

function hasContentHashSchema(db: IDBPDatabase<NotesDB>): boolean {
  if (!db.objectStoreNames.contains('notes')) return false;

  try {
    const tx = db.transaction('notes', 'readonly');
    const complete =
      tx.store.indexNames.contains('by-contentHash') &&
      tx.store.indexNames.contains('by-chainId-contentHash');
    void tx.done.catch(() => undefined);
    return complete;
  } catch {
    return false;
  }
}

export function ensureContentHashIndexes(
  db: IDBPDatabase<NotesDB>,
  transaction: UpgradeTransaction
): void {
  if (!db.objectStoreNames.contains('notes')) return;
  const notesStore = transaction.objectStore('notes');
  if (notesStore.indexNames.contains('by-contentHash')) {
    const contentHashIndex = notesStore.index('by-contentHash');
    if (contentHashIndex.unique) {
      notesStore.deleteIndex('by-contentHash');
    }
  }
  if (!notesStore.indexNames.contains('by-contentHash')) {
    notesStore.createIndex('by-contentHash', 'contentHash');
  }
  if (!notesStore.indexNames.contains('by-chainId-contentHash')) {
    notesStore.createIndex('by-chainId-contentHash', ['chainId', 'contentHash']);
  }
}

function hasNoteTagSchema(db: IDBPDatabase<NotesDB>): boolean {
  if (!db.objectStoreNames.contains('noteTags')) return false;

  try {
    const tx = db.transaction('noteTags', 'readonly');
    const store = tx.objectStore('noteTags');
    const complete =
      store.indexNames.contains('by-noteId') &&
      store.indexNames.contains('by-chainId') &&
      store.indexNames.contains('by-tagId');
    void tx.done.catch(() => undefined);
    return complete;
  } catch {
    return false;
  }
}

function ensureNoteTagStore(
  db: IDBPDatabase<NotesDB>,
  transaction: UpgradeTransaction
): void {
  if (!db.objectStoreNames.contains('noteTags')) {
    const noteTagsStore = db.createObjectStore('noteTags', {
      keyPath: ['noteId', 'tagId'],
    });
    noteTagsStore.createIndex('by-noteId', 'noteId');
    noteTagsStore.createIndex('by-chainId', 'chainId');
    noteTagsStore.createIndex('by-tagId', 'tagId');
    return;
  }

  const noteTagsStore = transaction.objectStore('noteTags');
  if (!noteTagsStore.indexNames.contains('by-noteId')) {
    noteTagsStore.createIndex('by-noteId', 'noteId');
  }
  if (!noteTagsStore.indexNames.contains('by-chainId')) {
    noteTagsStore.createIndex('by-chainId', 'chainId');
  }
  if (!noteTagsStore.indexNames.contains('by-tagId')) {
    noteTagsStore.createIndex('by-tagId', 'tagId');
  }
}

function ensureAttachmentStores(
  db: IDBPDatabase<NotesDB>,
  transaction: UpgradeTransaction
): void {
  if (!db.objectStoreNames.contains('attachments')) {
    const attachmentsStore = db.createObjectStore('attachments', { keyPath: 'id' });
    attachmentsStore.createIndex('by-chainId', 'chainId');
    attachmentsStore.createIndex('by-noteId', 'noteId');
  } else {
    const attachmentsStore = transaction.objectStore('attachments');
    if (!attachmentsStore.indexNames.contains('by-chainId')) {
      attachmentsStore.createIndex('by-chainId', 'chainId');
    }
    if (!attachmentsStore.indexNames.contains('by-noteId')) {
      attachmentsStore.createIndex('by-noteId', 'noteId');
    }
  }

  if (!db.objectStoreNames.contains('attachmentBlobs')) {
    db.createObjectStore('attachmentBlobs', { keyPath: 'id' });
  }
}

function upgradeSchema(
  db: IDBPDatabase<NotesDB>,
  oldVersion: number,
  _newVersion: number | null,
  transaction: UpgradeTransaction
): void {
  if (oldVersion < 1) {
    const chainsStore = db.createObjectStore('chains', { keyPath: 'id' });
    chainsStore.createIndex('by-createdAt', 'createdAt');
    chainsStore.createIndex('by-updatedAt', 'updatedAt');
    chainsStore.createIndex('by-archivedAt', 'archivedAt');
    chainsStore.createIndex('by-deletedAt', 'deletedAt');

    const notesStore = db.createObjectStore('notes', { keyPath: 'id' });
    notesStore.createIndex('by-chainId', 'chainId');
    notesStore.createIndex('by-chainId-position', ['chainId', 'position']);
    notesStore.createIndex('by-createdAt', 'createdAt');
    notesStore.createIndex('by-contentHash', 'contentHash');
    notesStore.createIndex('by-chainId-contentHash', ['chainId', 'contentHash']);

    const tagsStore = db.createObjectStore('tags', { keyPath: 'id' });
    tagsStore.createIndex('by-normalizedName', 'normalizedName', { unique: true });

    const chainTagsStore = db.createObjectStore('chainTags', {
      keyPath: ['chainId', 'tagId'],
    });
    chainTagsStore.createIndex('by-chainId', 'chainId');
    chainTagsStore.createIndex('by-tagId', 'tagId');
  }

  if (oldVersion < 2) {
    const chainsStore = transaction.objectStore('chains');
    if (chainsStore.indexNames.contains('by-isFavorite')) {
      chainsStore.deleteIndex('by-isFavorite');
    }
  }

  ensureNoteTagStore(db, transaction);
  ensureAttachmentStores(db, transaction);
  ensureContentHashIndexes(db, transaction);
}

const openCallbacks = {
  upgrade: upgradeSchema,
  blocked() {
    console.warn('[Notes] Database blocked — fechando abas antigas pode ajudar.');
  },
  blocking() {
    _db?.close();
    _db = null;
  },
  terminated() {
    _db = null;
  },
};

function openDatabase(version?: number): Promise<IDBPDatabase<NotesDB>> {
  return openDB<NotesDB>(DB_NAME, version, openCallbacks);
}

export async function getDatabase(): Promise<IDBPDatabase<NotesDB>> {
  if (_db) return _db;

  let db: IDBPDatabase<NotesDB>;
  try {
    db = await openDatabase(DB_VERSION);
  } catch (error: unknown) {
    if (!isVersionError(error)) throw error;
    db = await openDatabase();
  }

  if (
    !hasAttachmentSchema(db) ||
    !hasNoteTagSchema(db) ||
    !hasContentHashSchema(db)
  ) {
    const nextVersion = db.version + 1;
    db.close();
    db = await openDatabase(nextVersion);
  }

  _db = db;
  if (!hasAttachmentSchema(db)) {
    throw new Error('Banco de dados sem os stores de anexos.');
  }
  if (!hasNoteTagSchema(db)) {
    throw new Error('Banco de dados sem o store de tags de notas.');
  }
  if (!hasContentHashSchema(db)) {
    throw new Error('Banco de dados sem o índice de hash de conteúdo.');
  }
  return db;
}

/** Limpa o banco — apenas para testes */
export async function clearDatabase(): Promise<void> {
  const db = await getDatabase();
  const tx = db.transaction(
    [
      'chains',
      'notes',
      'tags',
      'chainTags',
      'noteTags',
      'attachments',
      'attachmentBlobs',
    ],
    'readwrite'
  );
  await Promise.all([
    tx.objectStore('chains').clear(),
    tx.objectStore('notes').clear(),
    tx.objectStore('tags').clear(),
    tx.objectStore('chainTags').clear(),
    tx.objectStore('noteTags').clear(),
    tx.objectStore('attachments').clear(),
    tx.objectStore('attachmentBlobs').clear(),
  ]);
  await tx.done;
}
