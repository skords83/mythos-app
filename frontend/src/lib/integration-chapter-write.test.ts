/** @jest-environment node */
import { chapterRevisionMatches, validateChapterReplacement } from './integration-chapter-write'
const payload = {
  confirmed: true,
  expectedUpdatedAt: '2026-10-16T10:00:00.000Z',
  title: ' Kapitel 24 ',
  content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hallo' }] }] },
}
test('accepts an explicitly confirmed Tiptap chapter revision', () => {
  const result = validateChapterReplacement(payload)
  expect(result.ok).toBe(true)
  if (result.ok) expect(result.value.title).toBe('Kapitel 24')
})
test('rejects unconfirmed replacement', () => {
  expect(validateChapterReplacement({ ...payload, confirmed: false }).ok).toBe(false)
})
test('rejects missing revision', () => {
  expect(validateChapterReplacement({ ...payload, expectedUpdatedAt: null }).ok).toBe(false)
})
test('rejects invalid document content', () => {
  expect(validateChapterReplacement({ ...payload, content: { text: 'not Tiptap' } }).ok).toBe(false)
})
test('rejects oversized document content', () => {
  expect(validateChapterReplacement({ ...payload, content: { type: 'doc', content: [{ text: 'x'.repeat(500001) }] } }).ok).toBe(false)
})
test('detects a revision changed after it was read', () => {
  expect(chapterRevisionMatches(new Date(payload.expectedUpdatedAt), payload.expectedUpdatedAt)).toBe(true)
  expect(chapterRevisionMatches(new Date('2026-10-16T10:00:01.000Z'), payload.expectedUpdatedAt)).toBe(false)
})
