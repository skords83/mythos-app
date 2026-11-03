/** @jest-environment node */
import { inspectChapter } from './chapter-text-edits'
const anchor = '<span data-character-mention="" data-character-id="fabian" data-label="Fabian">@Fabian</span>'
const place = '<span data-entity-mention="" data-entity-kind="PLACE" data-entity-id="south">Süden</span>'
const comment = '<mark data-comment-id="comment-1" data-comment-resolved="false">wichtiger Anker</mark>'
const source = `<p>Vor ${anchor} ging ${place}. ${comment}</p><p>Überflüssiger Satz.</p><p>Ein &amp; unveränderter Absatz.</p>`
function range(content: unknown, after: (text: string) => string, end = 2) {
  const chapter = inspectChapter(content)
  const before = chapter.blocks.slice(0, end + 1).map(b => b.text).join('\n\n')
  return chapter.apply([{ nodeId: `blocks.0-${end}`, before, after: after(before) }])
}
test.each([source, { content: source, metadata: { untouched: true } }])('rewrites, deletes, adds, splits and merges prose while preserving opaque anchors', content => {
  const result = range(content, text => text.replace('Vor ', 'Nach ').replace(' ging ', ' erreichte ').replace('Überflüssiger Satz.\n\n', '').replace('. ⟦mythos:0:5⟧', '.\n\n⟦mythos:0:5⟧') + '\n\nNeu ergänzt.')
  const html = typeof result === 'string' ? result : (result as any).content
  expect(html).toContain(anchor)
  expect(html).toContain(place)
  expect(html).toContain(comment)
  expect(html).toContain('<p>Ein &amp; unveränderter Absatz.</p>')
  expect(html).not.toContain('Überflüssig')
  expect(html).toContain('<p>Neu ergänzt.</p>')
  if (typeof content !== 'string') expect((result as any).metadata).toEqual(content.metadata)
})
test('merges and splits paragraphs, reorders exact original blocks and removes ranges', () => {
  expect(range('<p>Alt</p><p>Zwei</p><p>Drei</p>', () => 'Drei\n\nAlt und Zwei\n\nNeu')).toBe('<p>Drei</p><p>Alt und Zwei</p><p>Neu</p>')
  expect(range('<p>Alt</p><p>Bleibt</p>', () => '', 0)).toBe('<p>Bleibt</p>')
})
test.each([
  (s: string) => s.replace(/⟦mythos:[^⟧]+⟧/, ''),
  (s: string) => s + s.match(/⟦mythos:[^⟧]+⟧/)![0],
  (s: string) => s + '⟦mythos:99:99⟧',
  (s: string) => s + '⟦mythos:broken',
])('missing, duplicated, forged and malformed tokens fail closed', change => {
  expect(() => range(source, change)).toThrow(/token/i)
})
test('large rewrite reuses unchanged paragraphs byte for byte, including entity encodings and inline formatting', () => {
  const unchanged = '<p>Unverändert &#38; <strong title="original">fett</strong>.</p>'
  const content = '<p>' + 'Alt lang ausführlich. '.repeat(500) + '</p>' + unchanged + '<p>Ende</p>'
  const result = range(content, text => 'Gekürzt.\n\n' + text.split('\n\n')[1] + '\n\n' + 'Neue Passage. '.repeat(600))
  expect(result).toContain(unchanged)
  expect(result).not.toContain('Alt lang')
  expect((result as string).length).toBeGreaterThan(7000)
})
test('Tiptap preserves document attributes, marked text, character/place IDs and comment anchors', () => {
  const atoms = [
    { type: 'characterMention', attrs: { id: 'c', label: 'Fabian' } },
    { type: 'entityMention', attrs: { id: 'p', kind: 'PLACE', label: 'Süden' } },
    { type: 'text', text: 'Anker', marks: [{ type: 'comment', attrs: { commentId: 'comment-1' } }, { type: 'bold' }] },
  ]
  const content = { type: 'doc', attrs: { keep: 1 }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Vor ' }, ...atoms] }] }
  const result = range(content, text => text.replace('Vor ', 'Nachher\n\n') + '\n\nErgänzung', 0) as any
  expect(result.attrs).toEqual(content.attrs)
  expect(result.content[1].content).toEqual(atoms)
  expect(content.content).toHaveLength(1)
})
test('structural attributes, headings and ambiguous templates require node edits', () => {
  for (const html of ['<p id="anchor">Text</p>', '<h2>Titel</h2>', '<p>Literal ⟦mythos:0:1⟧</p>', '<p>A\n\nB</p>']) {
    expect(inspectChapter(html).blocks[0].editable).toBe(false)
    expect(() => range(html, () => 'Neu', 0)).toThrow(/structure/)
  }
})
test('overlap, stale templates and mixed addressing fail without mutating the input', () => {
  const doc = inspectChapter(source)
  const edit = { nodeId: 'blocks.1-1', before: doc.blocks[1].text, after: 'Neu' }
  expect(() => doc.apply([edit, edit])).toThrow(/Overlapping/)
  expect(() => doc.apply([{ ...edit, before: 'falsch' }])).toThrow(/Text conflict/)
  expect(() => doc.apply([edit, { nodeId: 'html.1.0', before: edit.before, after: '' }])).toThrow(/mix/)
})
test('empty node edits remove text without invalid empty Tiptap text nodes or losing neighboring marks', () => {
  expect(inspectChapter('<p>A<strong>B</strong>C</p>').apply([{ nodeId: 'html.0.0', before: 'A', after: '' }])).toBe('<p><strong>B</strong>C</p>')
  const content = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A' }, { type: 'text', text: 'B', marks: [{ type: 'bold' }] }] }] }
  expect(inspectChapter(content).apply([{ nodeId: 'doc.0.0', before: 'A', after: '' }])).toEqual({ type: 'doc', content: [{ type: 'paragraph', content: [content.content[0].content[1]] }] })
})
test('document-level comment anchors cannot be bypassed with paragraph ranges', () => {
  const content = { type: 'doc', attrs: { commentId: 'root-anchor' }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Anker' }] }] }
  expect(inspectChapter(content).blocks[0].editable).toBe(false)
  expect(() => range(content, () => '', 0)).toThrow(/structure/)
})
test('unchanged raw text encodings survive inside a changed paragraph', () => {
  const html = '<p>Vorher<strong>fett</strong> &#38; danach</p>'
  expect(range(html, text => text.replace('Vorher', 'Neu'), 0)).toBe(html.replace('Vorher', 'Neu'))
})
test('no-op edits preserve exact HTML and applying a reader twice never accumulates mutations', () => {
  const html = '<p>&#38; Alt</p>\n<p>Bleibt</p>'
  const doc = inspectChapter(html)
  const edit = { nodeId: doc.segments[0].nodeId, before: '& Alt', after: '& Alt' }
  expect(doc.apply([edit])).toBe(html)
  expect(doc.apply([{ ...edit, after: 'Neu' }])).toBe('<p>Neu</p>\n<p>Bleibt</p>')
  expect(doc.apply([edit])).toBe(html)
})
test.each([null, {}])('empty legacy documents do not silently accept edits to nonexistent nodes', content => {
  expect(() => inspectChapter(content).apply([{ nodeId: 'doc.0.0', before: '', after: 'Neu' }])).toThrow(/Text conflict/)
})
test('multiple disjoint edits preserve same-label identities and every untouched intervening byte', () => {
  const a = '<span data-character-mention="" data-character-id="a">Alex</span>'
  const b = '<span data-character-mention="" data-character-id="b">Alex</span>'
  const middle = '\n<p class="untouched">&#38; <mark data-comment-id="keep">Anker</mark></p>\n'
  const content = `<p>Vor ${a}</p>${middle}<p>${b} nach</p>`
  const doc = inspectChapter(content)
  expect(doc.blocks).toHaveLength(3)
  const result = doc.apply([
    { nodeId: 'blocks.0-0', before: doc.blocks[0].text, after: doc.blocks[0].text.replace('Vor ', 'Neu ') },
    { nodeId: 'blocks.2-2', before: doc.blocks[2].text, after: doc.blocks[2].text.replace(' nach', ' danach\n\nErgänzt') },
  ])
  expect(result).toBe(`<p>Neu ${a}</p>${middle}<p>${b} danach</p><p>Ergänzt</p>`)
})
test('pretty printed paragraph ranges reuse exact originals for no-op rewrites', () => {
  const html = '<p>Alt</p>\n  <p>Neu</p>'
  const doc = inspectChapter(html)
  expect(doc.blocks).toHaveLength(2)
  const before = doc.blocks.map(b => b.text).join('\n\n')
  expect(doc.apply([{ nodeId: 'blocks.0-1', before, after: before }])).toBe(html)
})
