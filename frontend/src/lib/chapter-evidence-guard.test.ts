/** @jest-environment node */
import { assertChapterEvidencePreserved } from './chapter-evidence-guard'
import { sourceHash } from './evidence-anchor'
const before = '<p>Vorher. Ein Anker. Danach.</p>'
const anchor = { id: 'e1', quote: 'Ein Anker.', prefix: 'Vorher. ', suffix: ' Danach.', commentId: null, sourceHash: sourceHash(before), flagged: false }
test('unrelated insertion preserves a uniquely located quote without changing the evidence', () => {
  expect(() => assertChapterEvidencePreserved(before, '<p>Neu</p>' + before, [anchor])).not.toThrow()
  expect(anchor.sourceHash).toBe(sourceHash(before))
})
test.each([before.replace('Anker', 'Anders'), before.replace('Vorher', 'Andere Einleitung'), before + before])('missing, changed-context and ambiguous anchors conflict precisely', after => {
  expect(() => assertChapterEvidencePreserved(before, after, [anchor])).toThrow(/e1/)
})
test('already missing evidence is not silently repaired and does not block unrelated changes', () => {
  expect(() => assertChapterEvidencePreserved('<p>Alt</p>', '<p>Neu</p>', [anchor])).not.toThrow()
})
