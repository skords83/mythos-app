import { DBSchema, IDBPDatabase, openDB } from 'idb';

export interface ChapterDraft {
  chapterId: string;
  content: string;
  lastSaved: Date;
}

interface DraftDB extends DBSchema {
  drafts: {
    key: string;
    value: ChapterDraft;
  };
}

let db: IDBPDatabase<DraftDB> | null = null;

async function getDB(): Promise<IDBPDatabase<DraftDB>> {
  if (!db) {
    db = await openDB<DraftDB>('mythos-chapter-drafts', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('drafts')) {
          db.createObjectStore('drafts', { keyPath: 'chapterId' });
        }
      },
    });
  }
  return db;
}

export async function saveDraft(draft: ChapterDraft): Promise<void> {
  const database = await getDB();
  // Store date as ISO string in database
  const stored = {
    ...draft,
    lastSaved: draft.lastSaved.toISOString(),
  };
  await database.put('drafts', stored as any);
}

export async function getDraft(
  chapterId: string
): Promise<ChapterDraft | undefined> {
  const database = await getDB();
  const stored = await database.get('drafts', chapterId);
  if (!stored) return undefined;
  // Convert ISO string back to Date
  return {
    ...stored,
    lastSaved: new Date((stored as any).lastSaved),
  };
}

export async function deleteDraft(chapterId: string): Promise<void> {
  const database = await getDB();
  await database.delete('drafts', chapterId);
}
