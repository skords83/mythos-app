import { hasProtectedChapterContent } from '../integration-protected-content'

describe('hasProtectedChapterContent', () => {
test.each([
['normaler Absatz', '<p>Ein normaler Text.</p>', false],
['leeres Kapitel', '', false],
['Figurenverweis', '<span data-character-mention="">@Fabian</span>', true],
['Ortsverweis', '<span data-entity-mention="" data-entity-id="123">@Bertinoro</span>', true],
['Kommentarmarkierung', '<mark data-comment-id="123">Text</mark>', true],
['Großschreibung', '<MARK DATA-COMMENT-ID="123">Text</MARK>', true],
['Attribut mit HTML-Zeichen', '<span title="> Hinweis" data-character-mention="">@Fabian</span>', true],
['HTML-Kommentar', '<!-- <mark data-comment-id="123"> -->', true],
['Gewöhnlicher Text mit Attributnamen', '<p>data-comment-id</p>', true],
['Ähnlicher Attributname', '<span data-comment-identifier="123">Text</span>', false],
])("%s", (_name, content, expected) => {
expect(hasProtectedChapterContent(content)).toBe(expected)
})

test("blockiert unbekannte Inhaltsformate", () => {
expect(hasProtectedChapterContent(null)).toBe(false)
expect(hasProtectedChapterContent({ type: "doc" })).toBe(true)
})
})

test('accepts empty legacy chapters and ordinary JSON prose while protecting JSON anchors', () => {
  expect(hasProtectedChapterContent({})).toBe(false)
  expect(hasProtectedChapterContent({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hallo' }] }] })).toBe(false)
  for (const node of [{ type: 'characterMention' }, { type: 'entityMention' }, { type: 'text', marks: [{ type: 'comment', attrs: { commentId: 'c' } }] }]) {
    expect(hasProtectedChapterContent({ type: 'doc', content: [{ type: 'paragraph', content: [node] }] })).toBe(true)
  }
  expect(hasProtectedChapterContent({ content: '<mark data-comment-id="c">Text</mark>' })).toBe(true)
})

test('fails closed for unknown JSON nodes and malformed protected nodes', () => {
  expect(hasProtectedChapterContent({ type: 'futureAnchor', attrs: { id: 'anchor' } })).toBe(true)
  expect(hasProtectedChapterContent({ type: 'characterMention', content: 'legacy' })).toBe(true)
})
