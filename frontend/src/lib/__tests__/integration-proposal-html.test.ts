import { proposalToChapterHtml } from '../integration-proposal-html'

describe('proposalToChapterHtml', () => {
  test('wandelt H1 und H2 korrekt um', () => {
    const document = { type: 'doc', content: [
      { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Kapitel 1' }] },
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Die Begegnung' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Fabian wartete.' }] },
    ] }
    expect(proposalToChapterHtml(document)).toBe('<h1>Kapitel 1</h1><h2>Die Begegnung</h2><p>Fabian wartete.</p>')
  })

  test('erhält fette Schrift in Überschriften', () => {
    expect(proposalToChapterHtml({ type: 'doc', content: [
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Wichtig', marks: [{ type: 'bold' }] }] }
    ] })).toBe('<h2><strong>Wichtig</strong></h2>')
  })

  test.each([0, 3, '1', null])('lehnt ungültige Ebene %s ab', level => {
    expect(proposalToChapterHtml({ type: 'doc', content: [
      { type: 'heading', attrs: { level }, content: [{ type: 'text', text: 'Titel' }] }
    ] })).toBeNull()
  })

  test('lehnt zusätzliche Attribute ab', () => {
    expect(proposalToChapterHtml({ type: 'doc', content: [
      { type: 'heading', attrs: { level: 1, id: 'test' } }
    ] })).toBeNull()
  })

  test('lehnt unbekannte Blocktypen ab', () => {
    expect(proposalToChapterHtml({ type: 'doc', content: [
      { type: 'bulletList', content: [] }
    ] })).toBeNull()
  })

  test('maskiert HTML-Sonderzeichen', () => {
    expect(proposalToChapterHtml({ type: 'doc', content: [
      { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '<Fabian & Malette>' }] }
    ] })).toBe('<h1>&lt;Fabian &amp; Malette&gt;</h1>')
  })

  test('wandelt eine Aufzählung um', () => {
    expect(proposalToChapterHtml({
      type: 'doc',
      content: [{
        type: 'bulletList',
        content: [
          { type: 'listItem', content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'Fabian' }] },
          ] },
          { type: 'listItem', content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'Malette' }] },
          ] },
        ],
      }],
    })).toBe('<ul><li><p>Fabian</p></li><li><p>Malette</p></li></ul>')
  })

  test('wandelt nummerierte Listen mit Startwert um', () => {
    expect(proposalToChapterHtml({
      type: 'doc',
      content: [{
        type: 'orderedList',
        attrs: { start: 3 },
        content: [{
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Dritter Punkt' }] }],
        }],
      }],
    })).toBe('<ol start="3"><li><p>Dritter Punkt</p></li></ol>')
  })

  test('unterstützt verschachtelte Listen', () => {
    expect(proposalToChapterHtml({
      type: 'doc',
      content: [{
        type: 'bulletList',
        content: [{
          type: 'listItem',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'Trolle' }] },
            { type: 'bulletList', content: [{
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Aginolf' }] }],
            }] },
          ],
        }],
      }],
    })).toBe('<ul><li><p>Trolle</p><ul><li><p>Aginolf</p></li></ul></li></ul>')
  })

  test('wandelt Zitate mit mehreren Absätzen um', () => {
    expect(proposalToChapterHtml({
      type: 'doc',
      content: [{
        type: 'blockquote',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'Erster Absatz' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'Zweiter Absatz' }] },
        ],
      }],
    })).toBe('<blockquote><p>Erster Absatz</p><p>Zweiter Absatz</p></blockquote>')
  })

  test('lehnt ungültige Listeneinträge ab', () => {
    expect(proposalToChapterHtml({
      type: 'doc',
      content: [{
        type: 'bulletList',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Kein Listeneintrag' }] }],
      }],
    })).toBeNull()
  })

  test('lehnt ungültige Startwerte ab', () => {
    expect(proposalToChapterHtml({
      type: 'doc',
      content: [{
        type: 'orderedList',
        attrs: { start: -1 },
        content: [{
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Eintrag' }] }],
        }],
      }],
    })).toBeNull()
  })

  test('lehnt unbekannte Elemente innerhalb von Zitaten ab', () => {
    expect(proposalToChapterHtml({
      type: 'doc',
      content: [{
        type: 'blockquote',
        content: [{ type: 'image', attrs: { src: 'test.png' } }],
      }],
    })).toBeNull()
  })
})
