import { nextChapterRevision } from './chapter-write-conflict'
test('revision always advances, including same tick and future client revisions', () => {
  const before = new Date('2099-01-01')
  expect(nextChapterRevision(before, before.getTime()).getTime()).toBe(before.getTime() + 1)
  expect(nextChapterRevision(before, 0).getTime()).toBe(before.getTime() + 1)
})
