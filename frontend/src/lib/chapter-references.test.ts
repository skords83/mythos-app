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

test('nested marks, repeated anchors, entities and unrelated attributes survive unlink', () => {
  const original = '<p title="&quot;">A&nbsp;<mark data-comment-id="live"><span data-character-mention="" data-character-id="gone" data-label="A&amp;B"><strong>@A&amp;B</strong></span></mark> Z</p>'
  const ref = chapterReferences(original).references.find(r => r.kind === 'CHARACTER')!
  const result = chapterReferences(original, { key: ref.key, targetId: null })
  expect(result.content).toBe(original.replace('data-character-mention=""', '').replace('data-character-id="gone"', ''))
  expect(chapterReferences(result.content).references).toEqual([expect.objectContaining({ kind: 'COMMENT', targetId: 'live' })])
})
test('repairing a missing ID in a self-closing source tag preserves its syntax', () => {
  const html = '<span data-character-mention=""/>Text'
  const ref = chapterReferences(html).references[0]
  expect(chapterReferences(html, { key: ref.key, targetId: 'new' }).content).toBe('<span data-character-mention="" data-character-id="new"/>Text')
})

test('detects malformed entity kinds and multiple independent anchors on one element', () => {
  const html = '<span data-comment-id="live" data-character-mention="" data-character-id="gone">@Ada</span><span data-entity-mention="" data-entity-id="gone">@Rom</span>'
  const refs = chapterReferences(html).references
  expect(refs.map(r => r.kind)).toEqual(['COMMENT', 'CHARACTER', 'UNKNOWN'])
  expect(new Set(refs.map(r => r.key)).size).toBe(3)
  const removed = chapterReferences(html, { key: refs[1].key, targetId: null })
  expect(String(removed.content)).toContain('data-comment-id="live"')
  expect(String(removed.content)).not.toContain('data-character-mention')
  expect(String(removed.content)).toContain('@Ada')
  const unknownRemoved = chapterReferences(html, { key: refs[2].key, targetId: null })
  expect(String(unknownRemoved.content)).toContain('@Rom')
  expect(String(unknownRemoved.content)).not.toContain('data-entity-mention')
})

test('removing one JSON comment never drops unrelated opaque marks', () => {
  const doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Text', marks: [
    { type: '__removeMark', attrs: { custom: 'preserve me' } }, { type: 'comment', attrs: { commentId: 'gone' } }, { type: 'bold' },
  ] }] }] }
  expect(chapterReferences(doc).content).toEqual(doc)
  const ref = chapterReferences(doc).references[0]
  const result = chapterReferences(doc, { key: ref.key, targetId: null })
  expect(result.content).toEqual({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Text', marks: [
    { type: '__removeMark', attrs: { custom: 'preserve me' } }, { type: 'bold' },
  ] }] }] })
})

test('comment repair synchronizes the resolved state in HTML and JSON', () => {
  const html = '<mark data-comment-id="gone" data-comment-resolved="true">Text</mark>'
  const ref = chapterReferences(html).references[0]
  expect(chapterReferences(html, { key: ref.key, targetId: 'new', resolved: false }).content).toBe('<mark data-comment-id="new" data-comment-resolved="false">Text</mark>')
  const json = { type: 'doc', content: [{ type: 'text', text: 'Text', marks: [{ type: 'comment', attrs: { commentId: 'gone', resolved: true } }] }] }
  const jsonRef = chapterReferences(json).references[0]
  expect(JSON.stringify(chapterReferences(json, { key: jsonRef.key, targetId: 'new', resolved: false }).content)).toContain('"commentId":"new","resolved":false')
})

test('unknown comment-shaped content nodes cannot be removed as if they were marks', () => {
  const doc = { type: 'doc', content: [{ type: 'comment', attrs: { commentId: 'gone' }, content: [{ type: 'text', text: 'Never discard this text' }] }] }
  expect(chapterReferences(doc).references).toEqual([])
  const result = chapterReferences(doc, { key: 'doc.content.0', targetId: null })
  expect(result.changed).toBe(false)
  expect(result.content).toEqual(doc)
})
