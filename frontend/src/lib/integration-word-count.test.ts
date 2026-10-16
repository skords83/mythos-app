/** @jest-environment node */
import { countTiptapWords } from './integration-word-count'

test('counts nested Tiptap text and ignores non-text metadata', () => {
  expect(countTiptapWords({
    type: 'doc', content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'Ein schöner Tag' }] },
      { type: 'paragraph', attrs: { label: 'ignored words' }, content: [{ type: 'text', text: 'beginnt jetzt.' }] },
    ],
  })).toBe(5)
})
test('empty document has zero words', () => {
  expect(countTiptapWords({ type: 'doc', content: [] })).toBe(0)
})
test('multiple whitespace characters separate words', () => {
  expect(countTiptapWords({ type: 'doc', content: [{ type: 'text', text: 'Hallo\n  liebe\tWelt' }] })).toBe(3)
})
