/** @jest-environment node */
import { locateEvidence, sourceHash, sourceText } from './evidence-anchor'
const content = '<p>Vorher. Ada hat grüne Augen. Danach.</p>'
const anchor = { quote: 'Ada hat grüne Augen.', prefix: '', suffix: '', commentId: null, sourceHash: sourceHash(content), flagged: false }
test('valid exact quote, survives prior insertions but marks changed source stale', () => {
  expect(locateEvidence(content, anchor).status).toBe('VALID')
  expect(locateEvidence('<p>Neu.</p>' + content, anchor).status).toBe('STALE')
  expect(locateEvidence('<p>Ada hat blaue Augen.</p>', anchor).status).toBe('MISSING')
  expect(locateEvidence(content, { ...anchor, flagged: true }).status).toBe('STALE')
})
test('context distinguishes repeated quotes; no invented matches', () => {
  expect(locateEvidence(content + content, anchor).status).toBe('AMBIGUOUS')
  expect(locateEvidence(content, { ...anchor, prefix: 'Vorher. ', suffix: ' Danach.' }).status).toBe('VALID')
  expect(locateEvidence(content, { ...anchor, prefix: 'falsch' }).status).toBe('MISSING')
})
test('existing comment IDs constrain the anchor, including missing marks', () => {
  const marked = '<p>Ada hat grüne Augen.</p><p><mark data-comment-id="c">Ada hat grüne Augen.</mark></p>'
  expect(locateEvidence(marked, { ...anchor, commentId: 'c', sourceHash: sourceHash(marked) }).status).toBe('VALID')
  expect(locateEvidence(content, { ...anchor, commentId: 'c' }).status).toBe('MISSING')
})
test('HTML and Tiptap JSON preserve inline word boundaries and decode entities', () => {
  const json = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Au' }, { type: 'text', text: 'gen', marks: [{ type: 'comment', attrs: { commentId: 'x' } }] }] }] }
  expect(sourceText(json)).toBe('Augen')
  expect(sourceText(json, 'x')).toBe('gen')
  expect(sourceText({ content: '<p>A &amp; <strong>B</strong></p><p>C</p>' })).toBe('A & B C')
  expect(sourceText(JSON.stringify(json))).toBe('Augen')
})
