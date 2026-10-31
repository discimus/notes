import { openDB } from 'idb';
import type { IDBPDatabase } from 'idb';
import type { NoteData } from '@domain/entities/index.js';
import type { ChainData } from '@domain/entities/index.js';
import type { TagData } from '@domain/entities/index.js';
import type { ChainTagData } from '@domain/entities/index.js';

export const DB_NAME = 'thread-notes-db';
export const DB_VERSION = 1;

export interface ThreadNotesDB {
  chains: {
    key: string;
    value: ChainData;
    indexes: {
      'by-createdAt': string;
      'by-updatedAt': string;
      'by-archivedAt': string;
      'by-deletedAt': string;
      'by-isFavorite': number;
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
    key: [string, string]; // [chainId, tagId]
    value: ChainTagData;
    indexes: {
      'by-chainId': string;
      'by-tagId': string;
    };
  };
}

let _db: IDBPDatabase<ThreadNotesDB> | null = null;

export async function getDatabase(): Promise<IDBPDatabase<ThreadNotesDB>> {
  if (_db) return _db;

  _db = await openDB<ThreadNotesDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, _newVersion, transaction) {
      // Versão 1 — schema inicial
      if (oldVersion < 1) {
        // chains
        const chainsStore = db.createObjectStore('chains', { keyPath: 'id' });
        chainsStore.createIndex('by-createdAt', 'createdAt');
        chainsStore.createIndex('by-updatedAt', 'updatedAt');
        chainsStore.createIndex('by-archivedAt', 'archivedAt');
        chainsStore.createIndex('by-deletedAt', 'deletedAt');
        chainsStore.createIndex('by-isFavorite', 'isFavorite');

        // notes
        const notesStore = db.createObjectStore('notes', { keyPath: 'id' });
        notesStore.createIndex('by-chainId', 'chainId');
        notesStore.createIndex('by-chainId-position', ['chainId', 'position']);
        notesStore.createIndex('by-createdAt', 'createdAt');

        // tags
        const tagsStore = db.createObjectStore('tags', { keyPath: 'id' });
        tagsStore.createIndex('by-normalizedName', 'normalizedName', { unique: true });

        // chainTags (compound key)
        const chainTagsStore = db.createObjectStore('chainTags', {
          keyPath: ['chainId', 'tagId'],
        });
        chainTagsStore.createIndex('by-chainId', 'chainId');
        chainTagsStore.createIndex('by-tagId', 'tagId');
      }

      void transaction; // future migration use
    },
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
  });

  return _db;
}

/** Limpa o banco — apenas para testes */
export async function clearDatabase(): Promise<void> {
  const db = await getDatabase();
  const tx = db.transaction(['chains', 'notes', 'tags', 'chainTags'], 'readwrite');
  await Promise.all([
    tx.objectStore('chains').clear(),
    tx.objectStore('notes').clear(),
    tx.objectStore('tags').clear(),
    tx.objectStore('chainTags').clear(),
  ]);
  await tx.done;
}
