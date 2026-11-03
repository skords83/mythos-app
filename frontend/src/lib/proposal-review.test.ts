import { reviewText, reviewDiff } from './proposal-review'
test('keeps complete long texts and block boundaries', () => {
  const text = 'Wort '.repeat(20000)
  expect(reviewText({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] })).toBe(text)
  expect(reviewText('<p>A &amp; B<br>C</p><p>D</p>')).toBe('A & B\nC\n\nD\n\n')
})
test('comparison retains every changed and unchanged line', () => {
  expect(reviewDiff('Start\nAlt\nEnde', 'Start\nNeu\nEnde')).toEqual({ opening: 'Start', removed: 'Alt', added: 'Neu', ending: 'Ende' })
  expect(reviewDiff('Text', 'Text').removed).toBe('')
})
test('paragraph rewrite previews expose the real text and boundaries rather than opaque edit tokens', () => {
  const preview = '<p>Neu <span data-character-mention="" data-character-id="a">@Ada</span></p><p><mark data-comment-id="c">Anker</mark> ergänzt.</p>'
  const proposal = { type: 'chapterTextEdits', preview }
  expect(reviewText(proposal)).toBe('Neu @Ada\n\nAnker ergänzt.\n\n')
  expect(reviewDiff('Alt @Ada\n\nAnker', reviewText(proposal)).added).toContain('Anker ergänzt.')
})
