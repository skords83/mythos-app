/**
 * @jest-environment node
 */
import { htmlToText, buildSnippet } from '../text'

describe('htmlToText', () => {
  it('strips tags and normalizes whitespace', () => {
    expect(htmlToText('<p>Hello   <strong>world</strong></p>')).toBe('Hello world')
  })

  it('decodes common HTML entities', () => {
    expect(htmlToText('Tom &amp; Jerry &lt;3&gt; &quot;fun&quot; &#39;times&#39;&nbsp;here')).toBe(
      'Tom & Jerry <3> "fun" \'times\' here'
    )
  })

  it('returns an empty string for empty input', () => {
    expect(htmlToText('')).toBe('')
  })
})

describe('buildSnippet', () => {
  it('returns the text unchanged when short and no match', () => {
    expect(buildSnippet('a short text', 'xyz')).toBe('a short text')
  })

  it('truncates long text with no match', () => {
    const longText = 'x'.repeat(200)
    const snippet = buildSnippet(longText, 'nomatch')
    expect(snippet.endsWith('…')).toBe(true)
    expect(snippet.length).toBeLessThan(longText.length)
  })

  it('centers the snippet around the match with ellipses on both sides', () => {
    const text = `${'a'.repeat(100)}NEEDLE${'b'.repeat(100)}`
    const snippet = buildSnippet(text, 'needle', 10)
    expect(snippet.toLowerCase()).toContain('needle')
    expect(snippet.startsWith('…')).toBe(true)
    expect(snippet.endsWith('…')).toBe(true)
  })

  it('matches case-insensitively', () => {
    const snippet = buildSnippet('The Quick Brown Fox', 'quick')
    expect(snippet).toContain('Quick')
  })

  it('returns an empty string for empty input', () => {
    expect(buildSnippet('', 'anything')).toBe('')
  })
})
