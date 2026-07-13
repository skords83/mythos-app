import 'fake-indexeddb/auto'
import { saveDraft, getDraft, deleteDraft } from '../chapterDraftStore'

// Polyfill structuredClone for Jest environment
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (value: any) => {
    return JSON.parse(JSON.stringify(value))
  }
}

describe('chapterDraftStore', () => {
  it('saves and retrieves a draft', async () => {
    await saveDraft('chapter-1', '<p>Hello</p>')
    const draft = await getDraft('chapter-1')
    expect(draft?.chapterId).toBe('chapter-1')
    expect(draft?.content).toBe('<p>Hello</p>')
    expect(typeof draft?.updatedAt).toBe('number')
  })

  it('returns undefined for a chapter with no draft', async () => {
    const draft = await getDraft('chapter-does-not-exist')
    expect(draft).toBeUndefined()
  })

  it('overwrites an existing draft for the same chapterId', async () => {
    await saveDraft('chapter-2', '<p>First</p>')
    await saveDraft('chapter-2', '<p>Second</p>')
    const draft = await getDraft('chapter-2')
    expect(draft?.content).toBe('<p>Second</p>')
  })

  it('deletes a draft', async () => {
    await saveDraft('chapter-3', '<p>Bye</p>')
    await deleteDraft('chapter-3')
    const draft = await getDraft('chapter-3')
    expect(draft).toBeUndefined()
  })
})
