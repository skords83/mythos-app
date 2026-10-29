import { chapterReferences } from './chapter-references'

test.each([
  ['CHARACTER', '<span data-character-mention="" data-character-id="gone" data-label="Ada">@Ada</span>'],
  ['PLACE', '<span data-entity-mention="" data-entity-kind="PLACE" data-entity-id="gone">@Rom</span>'],
  ['ITEM', '<span data-entity-mention="" data-entity-kind="ITEM" data-entity-id="gone">@Ring</span>'],
  ['COMMENT', '<mark data-comment-id="gone"><em>Wichtiger Text</em></mark>'],
])('detects and edits only the selected %s anchor', (kind, anchor) => {
  const html = '<p>Vorher &amp; ' + anchor + ' danach.</p>' + anchor
  const refs = chapterReferences(html).references
  expect(refs).toHaveLength(2)
  expect(refs[0]).toMatchObject({ kind, targetId: 'gone' })
  const repaired = chapterReferences(html, { key: refs[0].key, targetId: 'new' })
  expect(chapterReferences(repaired.content).references.map(r => r.targetId)).toEqual(['new', 'gone'])
  const removed = chapterReferences(html, { key: refs[0].key, targetId: null })
  expect(chapterReferences(removed.content).references).toHaveLength(1)
  const text = (value: unknown) => { const el = document.createElement('div'); el.innerHTML = String(value); return el.textContent }
  expect(text(removed.content)).toBe(text(html))
  expect(String(removed.content)).toContain(anchor)
  expect(String(removed.content)).toContain('Vorher &amp;')
})
test('legacy HTML wrapper and JSON mentions/comments retain prose', () => {
  const html = { content: '<p><mark data-comment-id="x">Text</mark></p>', meta: 1 }
  const removed = chapterReferences(html, { key: chapterReferences(html).references[0].key, targetId: null })
  expect(removed.content).toEqual({ content: '<p><mark >Text</mark></p>', meta: 1 })
  const doc = { type: 'doc', content: [{ type: 'paragraph', content: [
    { type: 'characterMention', attrs: { characterId: 'x', label: 'Ada' } },
    { type: 'text', text: ' sagte', marks: [{ type: 'comment', attrs: { commentId: 'c' } }, { type: 'bold' }] },
  ] }] }
  const refs = chapterReferences(doc).references
  expect(refs).toHaveLength(2)
  const unlinked = chapterReferences(doc, { key: refs[0].key, targetId: null }).content
  expect(JSON.stringify(unlinked)).toContain('"text":"@Ada"')
  const uncommented = chapterReferences(doc, { key: refs[1].key, targetId: null }).content
  expect(JSON.stringify(uncommented)).not.toContain('commentId')
  expect(JSON.stringify(uncommented)).toContain('"text":" sagte","marks":[{"type":"bold"}]')
  expect(chapterReferences(doc, { key: 'missing', targetId: null }).changed).toBe(false)
})
