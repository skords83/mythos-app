/** @jest-environment node */
import { inspectChapter } from './chapter-text-edits'
const html = '<p class="keep">Früh &amp; <strong>schön</strong> <span data-character-mention="" data-character-id="c">Ada</span> <span data-entity-mention="" data-entity-kind="PLACE" data-entity-id="p">Hafen</span> <span data-entity-mention="" data-entity-kind="ITEM" data-entity-id="i">Ring</span><mark data-comment-id="comment" data-comment-resolved="false"><em>Text</em></mark> danach.</p><p>Öl 🦉</p>'
test.each([html, { content: html, metadata: { keep: true } }])('HTML edits preserve every unrelated byte, anchor and wrapper', content => {
  const doc = inspectChapter(content)
  expect(doc.text).toBe('Früh & schön Ada Hafen RingText danach.\nÖl 🦉\n')
  const before = doc.segments[0], after = doc.segments.find(s => s.text === ' danach.')!
  const result = doc.apply([{ nodeId: before.nodeId, before: before.text, after: 'Spät & ' }, { nodeId: after.nodeId, before: after.text, after: ' später <sicher>.' }])
  const expected = html.replace('Früh &amp; ', 'Spät &amp; ').replace(' danach.', ' später &lt;sicher&gt;.')
  expect(result).toEqual(typeof content === 'string' ? expected : { ...content, content: expected })
})
test('protected spans, repeated names and comments cannot be edited or guessed', () => {
  for (const segment of inspectChapter(html).segments.filter(s => s.protected)) {
    expect(() => inspectChapter(html).apply([{ nodeId: segment.nodeId, before: segment.text, after: 'Neu' }])).toThrow(/Protected text conflict/)
  }
  expect(() => inspectChapter(html).apply([{ nodeId: 'html.999', before: 'Ada', after: 'Neu' }])).toThrow(/Text conflict/)
})
test('Tiptap identities, comment marks, formatting and document attributes survive edits', () => {
  const value = { type: 'doc', attrs: { keep: 'yes' }, content: [{ type: 'paragraph', content: [
    { type: 'text', text: 'Vorher', marks: [{ type: 'bold' }] },
    { type: 'entityMention', attrs: { id: 'item', kind: 'ITEM', label: 'Ring' } },
    { type: 'text', text: 'Anker', marks: [{ type: 'comment', attrs: { commentId: 'c' } }] },
    { type: 'text', text: 'Nachher' },
  ] }] }
  const doc = inspectChapter(value)
  expect(doc.text).toBe('VorherRingAnkerNachher\n')
  const result = doc.apply([{ nodeId: 'doc.0.0', before: 'Vorher', after: 'Länger vorher' }, { nodeId: 'doc.0.3', before: 'Nachher', after: 'Kürzer' }]) as typeof value
  expect(result.content[0].content.slice(1, 3)).toEqual(value.content[0].content.slice(1, 3))
  expect(result.content[0].content[0].marks).toEqual(value.content[0].content[0].marks)
  expect(result.attrs).toEqual(value.attrs)
  expect(value.content[0].content[0].text).toBe('Vorher')
  expect(() => inspectChapter(value).apply([{ nodeId: 'doc.0.2', before: 'Anker', after: 'Anders' }])).toThrow(/Protected/)
})
test.each([null, {}, '', { type: 'doc', content: [] }])('valid empty formats are explicit', value => {
  expect(inspectChapter(value).text).toBe('')
})
test.each([[], 1, { broken: true }, { type: 'doc', content: [{ type: 'text' }] }])('unknown or broken formats fail explicitly', value => {
  expect(() => inspectChapter(value)).toThrow()
})
