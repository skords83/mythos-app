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
})
