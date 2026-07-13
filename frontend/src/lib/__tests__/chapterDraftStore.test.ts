import 'fake-indexeddb/auto';
import { saveDraft, getDraft, deleteDraft } from '../chapterDraftStore';

// Polyfill structuredClone for Jest environment
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (value: any) => {
    return JSON.parse(JSON.stringify(value));
  };
}

describe('chapterDraftStore', () => {
  beforeEach(async () => {
    // Clear IndexedDB before each test
    const databases = await (indexedDB as any).databases?.();
    if (databases) {
      for (const db of databases) {
        indexedDB.deleteDatabase(db.name);
      }
    }
  });

  it('should save and retrieve a chapter draft', async () => {
    const draft = {
      chapterId: 'ch-123',
      content: 'Test chapter content',
      lastSaved: new Date(),
    };

    await saveDraft(draft);
    const retrieved = await getDraft('ch-123');

    expect(retrieved).toEqual(draft);
  });

  it('should delete a chapter draft', async () => {
    const draft = {
      chapterId: 'ch-456',
      content: 'Test chapter content',
      lastSaved: new Date(),
    };

    await saveDraft(draft);
    await deleteDraft('ch-456');
    const retrieved = await getDraft('ch-456');

    expect(retrieved).toBeUndefined();
  });

  it('should return undefined for non-existent draft', async () => {
    const retrieved = await getDraft('non-existent');
    expect(retrieved).toBeUndefined();
  });
});
