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
