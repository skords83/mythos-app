import { openDB, IDBPDatabase } from 'idb'

export interface ChapterDraft {
  chapterId: string
  content: string
  updatedAt: number
}

const DB_NAME = 'mythos-chapter-drafts'
const DB_VERSION = 1
const STORE_NAME = 'chapterDrafts'

let dbPromise: Promise<IDBPDatabase> | null = null

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'chapterId' })
        }
      },
    })
  }
  return dbPromise
}

export async function saveDraft(chapterId: string, content: string): Promise<void> {
  const db = await getDb()
  const draft: ChapterDraft = { chapterId, content, updatedAt: Date.now() }
  await db.put(STORE_NAME, draft)
}

export async function getDraft(chapterId: string): Promise<ChapterDraft | undefined> {
  const db = await getDb()
  return db.get(STORE_NAME, chapterId)
}

export async function deleteDraft(chapterId: string): Promise<void> {
  const db = await getDb()
  await db.delete(STORE_NAME, chapterId)
}
