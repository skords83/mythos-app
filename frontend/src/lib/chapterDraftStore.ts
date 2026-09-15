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

export async function deleteDraft(chapterId: string, savedContent?: string): Promise<void> {
  const db = await getDb()
  // Keep comparison and deletion atomic: a slow save response must not delete
  // text written to IndexedDB while that request was in flight.
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const draft: ChapterDraft | undefined = await tx.store.get(chapterId)
  if (savedContent === undefined || draft?.content === savedContent) {
    await tx.store.delete(chapterId)
  }
  await tx.done
}
