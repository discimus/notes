import { openDB } from 'idb';
import type { IDBPDatabase, IDBPTransaction, StoreNames } from 'idb';
import type { NoteData } from '@domain/entities/index.js';
import type { ChainData } from '@domain/entities/index.js';
import type { TagData } from '@domain/entities/index.js';
import type { ChainTagData } from '@domain/entities/index.js';
import type { AttachmentData } from '@domain/entities/index.js';

export const DB_NAME = 'thread-notes-db';
export const DB_VERSION = 5;

export interface ThreadNotesDB {
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
  ThreadNotesDB,
  StoreNames<ThreadNotesDB>[],
  'versionchange'
>;

let _db: IDBPDatabase<ThreadNotesDB> | null = null;

function isVersionError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: unknown }).name === 'VersionError'
  );
}

function hasAttachmentSchema(db: IDBPDatabase<ThreadNotesDB>): boolean {
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

function ensureAttachmentStores(
  db: IDBPDatabase<ThreadNotesDB>,
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
  db: IDBPDatabase<ThreadNotesDB>,
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

  ensureAttachmentStores(db, transaction);
}

const openCallbacks = {
  upgrade: upgradeSchema,
  blocked() {
    console.warn('[ThreadNotes] Database blocked — fechando abas antigas pode ajudar.');
  },
  blocking() {
    _db?.close();
    _db = null;
  },
  terminated() {
    _db = null;
  },
};

function openDatabase(version?: number): Promise<IDBPDatabase<ThreadNotesDB>> {
  return openDB<ThreadNotesDB>(DB_NAME, version, openCallbacks);
}

export async function getDatabase(): Promise<IDBPDatabase<ThreadNotesDB>> {
  if (_db) return _db;

  let db: IDBPDatabase<ThreadNotesDB>;
  try {
    db = await openDatabase(DB_VERSION);
  } catch (error: unknown) {
    if (!isVersionError(error)) throw error;
    db = await openDatabase();
  }

  if (!hasAttachmentSchema(db)) {
    const nextVersion = db.version + 1;
    db.close();
    db = await openDatabase(nextVersion);
  }

  _db = db;
  if (!hasAttachmentSchema(db)) {
    throw new Error('Banco de dados sem os stores de anexos.');
  }
  return db;
}

/** Limpa o banco — apenas para testes */
export async function clearDatabase(): Promise<void> {
  const db = await getDatabase();
  const tx = db.transaction(
    ['chains', 'notes', 'tags', 'chainTags', 'attachments', 'attachmentBlobs'],
    'readwrite'
  );
  await Promise.all([
    tx.objectStore('chains').clear(),
    tx.objectStore('notes').clear(),
    tx.objectStore('tags').clear(),
    tx.objectStore('chainTags').clear(),
    tx.objectStore('attachments').clear(),
    tx.objectStore('attachmentBlobs').clear(),
  ]);
  await tx.done;
}
